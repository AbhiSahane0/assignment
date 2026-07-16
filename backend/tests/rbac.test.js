const request = require('supertest');
const app = require('../src/app');
const { startDB, stopDB, clearDB, seedUsers } = require('./setup');

let tokens = {};
let users = {};

const login = async (email, password) => {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.token;
};

beforeAll(startDB);
afterAll(stopDB);
beforeEach(async () => {
  await clearDB();
  users = await seedUsers();
  tokens.admin = await login('admin@test.com', 'Admin@123');
  tokens.hr = await login('hr@test.com', 'Hr@12345');
  tokens.emp = await login('emp@test.com', 'Emp@1234');
});

const newEmployeePayload = (overrides = {}) => ({
  employeeId: 'T-100',
  name: 'New Person',
  email: 'new@test.com',
  password: 'Pass@123',
  phone: '9999900100',
  department: 'Engineering',
  designation: 'Developer',
  salary: 50000,
  joiningDate: '2024-01-01',
  ...overrides,
});

describe('RBAC: employee list', () => {
  it('EMPLOYEE cannot list all employees', async () => {
    const res = await request(app).get('/api/employees').set('Authorization', `Bearer ${tokens.emp}`);
    expect(res.status).toBe(403);
  });

  it('HR can list employees', async () => {
    const res = await request(app).get('/api/employees').set('Authorization', `Bearer ${tokens.hr}`);
    expect(res.status).toBe(200);
    expect(res.body.pagination.total).toBe(3);
  });
});

describe('RBAC: create', () => {
  it('HR can create a regular employee', async () => {
    const res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${tokens.hr}`)
      .send(newEmployeePayload());
    expect(res.status).toBe(201);
  });

  it('HR cannot create a SUPER_ADMIN', async () => {
    const res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${tokens.hr}`)
      .send(newEmployeePayload({ role: 'SUPER_ADMIN' }));
    expect(res.status).toBe(403);
  });

  it('EMPLOYEE cannot create employees', async () => {
    const res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${tokens.emp}`)
      .send(newEmployeePayload());
    expect(res.status).toBe(403);
  });

  it('rejects invalid payload (backend validation)', async () => {
    const res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send(newEmployeePayload({ email: 'bad-email', phone: '123', salary: -5 }));
    expect(res.status).toBe(400);
    const fields = res.body.errors.map((e) => e.field);
    expect(fields).toEqual(expect.arrayContaining(['email', 'phone', 'salary']));
  });
});

describe('RBAC: update & delete', () => {
  it('EMPLOYEE can update own phone', async () => {
    const res = await request(app)
      .put(`/api/employees/${users.emp._id}`)
      .set('Authorization', `Bearer ${tokens.emp}`)
      .send({ phone: '8888800001' });
    expect(res.status).toBe(200);
    expect(res.body.data.phone).toBe('8888800001');
  });

  it('EMPLOYEE cannot update own salary', async () => {
    const res = await request(app)
      .put(`/api/employees/${users.emp._id}`)
      .set('Authorization', `Bearer ${tokens.emp}`)
      .send({ salary: 999999 });
    expect(res.status).toBe(403);
  });

  it("EMPLOYEE cannot update someone else's profile", async () => {
    const res = await request(app)
      .put(`/api/employees/${users.hr._id}`)
      .set('Authorization', `Bearer ${tokens.emp}`)
      .send({ phone: '8888800002' });
    expect(res.status).toBe(403);
  });

  it('HR cannot promote anyone to SUPER_ADMIN', async () => {
    const res = await request(app)
      .put(`/api/employees/${users.emp._id}`)
      .set('Authorization', `Bearer ${tokens.hr}`)
      .send({ role: 'SUPER_ADMIN' });
    expect(res.status).toBe(403);
  });

  it('HR cannot delete an employee', async () => {
    const res = await request(app)
      .delete(`/api/employees/${users.emp._id}`)
      .set('Authorization', `Bearer ${tokens.hr}`);
    expect(res.status).toBe(403);
  });

  it('SUPER_ADMIN soft-deletes an employee', async () => {
    const del = await request(app)
      .delete(`/api/employees/${users.emp._id}`)
      .set('Authorization', `Bearer ${tokens.admin}`);
    expect(del.status).toBe(200);

    const get = await request(app)
      .get(`/api/employees/${users.emp._id}`)
      .set('Authorization', `Bearer ${tokens.admin}`);
    expect(get.status).toBe(404); // hidden from reads but still in DB
  });
});
