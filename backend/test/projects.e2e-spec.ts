import { createTestApp, type TestApp } from './test-app.js';

describe('Projects', () => {
  let t: TestApp;
  let admin: string;
  let dev: string;

  beforeAll(async () => {
    t = await createTestApp();
  });
  beforeEach(async () => {
    await t.reset();
    await t.createUser('admin@example.com', 'ADMIN');
    await t.createUser('dev@example.com');
    admin = await t.login('admin@example.com');
    dev = await t.login('dev@example.com');
  });
  afterAll(() => t.app.close());

  const create = (body: object, cookie = admin) =>
    t.http().post('/api/projects').set('Cookie', cookie).send(body);
  const patch = (id: string, body: object, cookie = admin) =>
    t.http().patch(`/api/projects/${id}`).set('Cookie', cookie).send(body);
  const get = (path: string, cookie = dev) =>
    t.http().get(`/api/projects${path}`).set('Cookie', cookie);

  it('requires a session to read and an admin to write', async () => {
    await t.http().get('/api/projects').expect(401);
    const { body } = await create({ name: 'Shop' }).expect(201);
    await create({ name: 'Other' }, dev).expect(403);
    await patch(body.id, { archived: true }, dev).expect(403);
  });

  it('lets a developer list and read projects', async () => {
    const { body } = await create({
      name: '  Shop ',
      description: 'Store',
    }).expect(201);
    expect(body).toMatchObject({
      name: 'Shop',
      description: 'Store',
      archivedAt: null,
    });
    expect((await get('').expect(200)).body).toEqual([body]);
    expect((await get(`/${body.id}`).expect(200)).body).toEqual(body);
  });

  it('updates only the given fields', async () => {
    const { body } = await create({ name: 'Shop', description: 'Store' });
    const updated = await patch(body.id, { name: 'Shop 2' }).expect(200);
    expect(updated.body).toEqual({ ...body, name: 'Shop 2' });
  });

  it('archives once and restores', async () => {
    const { body } = await create({ name: 'Shop' });
    const first = await patch(body.id, { archived: true }).expect(200);
    expect(first.body.archivedAt).not.toBeNull();
    const second = await patch(body.id, {
      archived: true,
      description: 'x',
    }).expect(200);
    expect(second.body).toEqual({ ...first.body, description: 'x' });
    const restored = await patch(body.id, { archived: false }).expect(200);
    expect(restored.body.archivedAt).toBeNull();
  });

  it('rejects duplicate names, invalid input and unknown projects', async () => {
    const { body } = await create({ name: 'Shop' });
    await create({ name: 'Other' }).expect(201);
    await create({ name: 'Shop' }).expect(409);
    await patch(body.id, { name: 'Other' }).expect(409);
    await create({ name: '   ' }).expect(400);
    await create({ name: 'a\u0000b' }).expect(400);
    await create({ name: 'X', archivedAt: '2026-01-01' }).expect(400);
    await patch(body.id, { name: null }).expect(400);
    const unknown = '00000000-0000-4000-8000-000000000000';
    await get(`/${unknown}`).expect(404);
    await patch(unknown, { archived: true }).expect(404);
  });
});
