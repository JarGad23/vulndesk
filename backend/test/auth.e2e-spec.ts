import { createTestApp, PASSWORD, type TestApp } from './test-app.js';

describe('Auth', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  beforeEach(() => t.reset());
  afterAll(() => t.app.close());

  const attempt = (email: string, password: string) =>
    t.http().post('/api/auth/login').send({ email, password });

  it('logs in, sets a protected cookie and never returns the hash', async () => {
    await t.createUser('dev@example.com');
    const response = await attempt(' DEV@example.com ', PASSWORD).expect(200);
    expect(response.body).toMatchObject({
      email: 'dev@example.com',
      role: 'DEVELOPER',
    });
    expect(response.body).not.toHaveProperty('passwordHash');
    const cookie = response.get('Set-Cookie')![0];
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
    const token = cookie.split(';')[0].split('=')[1];
    const session = await t.prisma.session.findFirstOrThrow();
    expect(session.tokenHash).not.toBe(token);
  });

  it('stores passwords as Argon2id', async () => {
    const user = await t.createUser('dev@example.com');
    expect(user.passwordHash).toMatch(/^\$argon2id\$/);
  });

  it('returns the same error for an unknown, wrong or blocked account', async () => {
    await t.createUser('dev@example.com');
    await t.createUser('blocked@example.com', 'DEVELOPER', false);
    const responses = [
      await attempt('nobody@example.com', PASSWORD),
      await attempt('dev@example.com', 'wrong'),
      await attempt('blocked@example.com', PASSWORD),
    ];
    for (const response of responses) {
      expect(response.status).toBe(401);
      expect(response.body).toEqual(responses[0].body);
    }
  });

  it('rejects requests without a session, with a forged and with an expired one', async () => {
    await t.createUser('dev@example.com');
    const cookie = await t.login('dev@example.com');
    await t.http().get('/api/auth/me').expect(401);
    await t
      .http()
      .get('/api/auth/me')
      .set('Cookie', 'vulndesk_session=forged')
      .expect(401);
    await t.http().get('/api/auth/me').set('Cookie', cookie).expect(200);
    await t.prisma.session.updateMany({ data: { expiresAt: new Date(0) } });
    await t.http().get('/api/auth/me').set('Cookie', cookie).expect(401);
  });

  it('invalidates the session on logout', async () => {
    await t.createUser('dev@example.com');
    const cookie = await t.login('dev@example.com');
    await t.http().post('/api/auth/logout').set('Cookie', cookie).expect(204);
    await t.http().get('/api/auth/me').set('Cookie', cookie).expect(401);
  });

  it('allows exactly five parallel attempts per minute', async () => {
    const responses = await Promise.all(
      Array.from({ length: 8 }, () => attempt('x@example.com', 'wrong')),
    );
    const statuses = responses.map((r) => r.status);
    expect(statuses.filter((s) => s === 401)).toHaveLength(5);
    expect(statuses.filter((s) => s === 429)).toHaveLength(3);
  });

  it('cannot be bypassed with a spoofed X-Forwarded-For and resets after a minute', async () => {
    for (let i = 0; i < 5; i++) {
      await attempt('x@example.com', 'wrong')
        .set('X-Forwarded-For', `10.0.0.${i}`)
        .expect(401);
    }
    await attempt('x@example.com', 'wrong')
      .set('X-Forwarded-For', '10.0.0.9')
      .expect(429);
    await t.prisma
      .$executeRaw`UPDATE "LoginWindow" SET "windowStart" = now() - interval '61 seconds'`;
    await attempt('x@example.com', 'wrong').expect(401);
  });

  it('rejects malformed input', async () => {
    await t
      .http()
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: 'x' })
      .expect(400);
    await t
      .http()
      .post('/api/auth/login')
      .send({ email: { contains: '@' }, password: 'x' })
      .expect(400);
  });
});
