const request = require('supertest');
const app = require('../src/app');
const Employee = require('../src/models/Employee');
const { buildTree } = require('../src/utils/hierarchy');
const { startDB, stopDB, clearDB, seedUsers } = require('./setup');

let token;
let users;

beforeAll(startDB);
afterAll(stopDB);
beforeEach(async () => {
  await clearDB();
  users = await seedUsers();
  const res = await request(app).post('/api/auth/login').send({ email: 'admin@test.com', password: 'Admin@123' });
  token = res.body.token;
});

const setManager = (employeeId, managerId) =>
  request(app)
    .patch(`/api/employees/${employeeId}/manager`)
    .set('Authorization', `Bearer ${token}`)
    .send({ managerId });

describe('PATCH /api/employees/:id/manager', () => {
  it('assigns a reporting manager', async () => {
    const res = await setManager(users.emp._id, users.hr._id);
    expect(res.status).toBe(200);
    expect(String(res.body.data.reportingManager._id)).toBe(String(users.hr._id));
  });

  it('rejects self as manager', async () => {
    const res = await setManager(users.emp._id, users.emp._id);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/circular/i);
  });

  it('rejects a direct two-node cycle (A→B, B→A)', async () => {
    await setManager(users.emp._id, users.hr._id); // emp reports to hr
    const res = await setManager(users.hr._id, users.emp._id); // hr reports to emp → cycle
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/circular/i);
  });

  it('rejects a deeper cycle (A→B→C, C→A)', async () => {
    await setManager(users.hr._id, users.admin._id); // hr → admin
    await setManager(users.emp._id, users.hr._id); // emp → hr
    const res = await setManager(users.admin._id, users.emp._id); // admin → emp → cycle
    expect(res.status).toBe(400);
  });

  it('clears the manager with null', async () => {
    await setManager(users.emp._id, users.hr._id);
    const res = await setManager(users.emp._id, null);
    expect(res.status).toBe(200);
    expect(res.body.data.reportingManager).toBeNull();
  });
});

describe('GET /api/organization/tree & reportees', () => {
  it('returns the reporting tree with direct reports nested', async () => {
    await setManager(users.hr._id, users.admin._id);
    await setManager(users.emp._id, users.hr._id);

    const res = await request(app).get('/api/organization/tree').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);

    const root = res.body.data.find((n) => n.email === 'admin@test.com');
    expect(root).toBeDefined();
    expect(root.directReports.map((r) => r.email)).toContain('hr@test.com');
    const hrNode = root.directReports.find((r) => r.email === 'hr@test.com');
    expect(hrNode.directReports.map((r) => r.email)).toContain('emp@test.com');
  });

  it('lists direct reports via /reportees', async () => {
    await setManager(users.emp._id, users.hr._id);
    const res = await request(app)
      .get(`/api/employees/${users.hr._id}/reportees`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].email).toBe('emp@test.com');
  });
});

describe('buildTree (unit)', () => {
  it('treats employees with missing managers as roots', () => {
    const tree = buildTree([
      { _id: '1', name: 'A', reportingManager: null },
      { _id: '2', name: 'B', reportingManager: '1' },
      { _id: '3', name: 'C', reportingManager: 'ghost' },
    ]);
    expect(tree).toHaveLength(2);
  });
});
