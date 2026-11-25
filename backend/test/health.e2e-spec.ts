import { createTestApp, type TestApp } from './test-app.js';

describe('Health', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.app.close());

  it('is public', () =>
    t.http().get('/api/health').expect(200, { status: 'ok' }));
});
