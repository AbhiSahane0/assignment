const request = require('supertest');
const app = require('../src/app');
const { startDB, stopDB, clearDB, seedUsers } = require('./setup');

beforeAll(startDB);
afterAll(stopDB);
beforeEach(async () => {
  await clearDB();
  await seedUsers();
});

describe('POST /api/auth/login', () => {
  it('logs in with valid credentials and returns a token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'Admin@123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('SUPER_ADMIN');
    expect(res.body.user.password).toBeUndefined();
  });

  it('rejects wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('rejects invalid email format (validation)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: 'x' });
    expect(res.status).toBe(400);
  });
});

describe('Protected routes', () => {
  it('rejects requests without a token', async () => {
    const res = await request(app).get('/api/employees');
    expect(res.status).toBe(401);
  });

  it('rejects a malformed token', async () => {
    const res = await request(app)
      .get('/api/employees')
      .set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });
});
