import { createTestApp, PASSWORD, type TestApp } from './test-app.js';

describe('Users', () => {
  let t: TestApp;
  let adminId: string;
  let devId: string;
  let admin: string;
  let dev: string;

  beforeAll(async () => {
    t = await createTestApp();
  });
  beforeEach(async () => {
    await t.reset();
    adminId = (await t.createUser('admin@example.com', 'ADMIN')).id;
    devId = (await t.createUser('dev@example.com')).id;
    admin = await t.login('admin@example.com');
    dev = await t.login('dev@example.com');
  });
  afterAll(() => t.app.close());

  const newUser = {
    email: 'New@example.com',
    name: 'New',
    password: PASSWORD,
    role: 'DEVELOPER',
  };
  const patch = (id: string, cookie: string, body: object) =>
    t.http().patch(`/api/users/${id}`).set('Cookie', cookie).send(body);

  it('returns 401 without a session and 403 for a developer', async () => {
    await t.http().get('/api/users').expect(401);
    await t.http().get('/api/users').set('Cookie', dev).expect(403);
    await t
      .http()
      .post('/api/users')
      .set('Cookie', dev)
      .send(newUser)
      .expect(403);
    await patch(devId, dev, { role: 'ADMIN' }).expect(403);
  });

  it('lists users without password hashes', async () => {
    const { body } = await t
      .http()
      .get('/api/users')
      .set('Cookie', admin)
      .expect(200);
    expect(body).toHaveLength(2);
    expect(JSON.stringify(body)).not.toContain('argon2');
  });

  it('creates a user who can log in and rejects a duplicate e-mail', async () => {
    const { body } = await t
      .http()
      .post('/api/users')
      .set('Cookie', admin)
      .send(newUser)
      .expect(201);
    expect(body).toMatchObject({ email: 'new@example.com', active: true });
    await t.login('new@example.com');
    await t
      .http()
      .post('/api/users')
      .set('Cookie', admin)
      .send(newUser)
      .expect(409);
  });

  it('validates new users and updates', async () => {
    const create = (body: object) =>
      t.http().post('/api/users').set('Cookie', admin).send(body);
    await create({ ...newUser, password: 'short' }).expect(400);
    await create({ ...newUser, role: 'ROOT' }).expect(400);
    await create({ ...newUser, passwordHash: 'x' }).expect(400);
    await patch(devId, admin, { active: null }).expect(400);
    await patch('not-a-uuid', admin, { active: false }).expect(400);
    await patch('00000000-0000-4000-8000-000000000000', admin, {
      active: false,
    }).expect(404);
  });

  it('blocks an account immediately and does not revive its session', async () => {
    await patch(devId, admin, { active: false }).expect(200);
    await t.http().get('/api/auth/me').set('Cookie', dev).expect(401);
    await patch(devId, admin, { active: true }).expect(200);
    await t.http().get('/api/auth/me').set('Cookie', dev).expect(401);
  });

  it('applies a role change to the existing session', async () => {
    await patch(devId, admin, { role: 'ADMIN' }).expect(200);
    await t.http().get('/api/users').set('Cookie', dev).expect(200);
  });

  it('does not let an admin lock themselves out', async () => {
    await patch(adminId, admin, { active: false }).expect(409);
    await patch(adminId, admin, { role: 'DEVELOPER' }).expect(409);
  });
});
