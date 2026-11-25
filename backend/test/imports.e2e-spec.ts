import { readFileSync } from 'node:fs';
import { createTestApp, type TestApp } from './test-app.js';

const real = readFileSync(
  new URL('./fixtures/npm-audit-v2.json', import.meta.url),
);
const advisory = {
  source: 1,
  name: 'pkg',
  title: 'Bug',
  url: null,
  severity: 'high',
  range: '<1.0.0',
};
const report = (via: object[]) =>
  Buffer.from(
    JSON.stringify({
      auditReportVersion: 2,
      vulnerabilities: { pkg: { via } },
    }),
  );

describe('Imports', () => {
  let t: TestApp;
  let dev: string;
  let devId: string;
  let projectId: string;

  beforeAll(async () => {
    t = await createTestApp();
  });
  beforeEach(async () => {
    await t.reset();
    devId = (await t.createUser('dev@example.com')).id;
    dev = await t.login('dev@example.com');
    projectId = (await t.prisma.project.create({ data: { name: 'Shop' } })).id;
  });
  afterAll(() => t.app.close());

  const upload = (content: Buffer, id = projectId) =>
    t
      .http()
      .post(`/api/projects/${id}/imports`)
      .set('Cookie', dev)
      .attach('file', content, 'raport.json');
  const counts = (created: number, reopened: number, skipped: number) => ({
    createdCount: created,
    reopenedCount: reopened,
    skippedCount: skipped,
  });
  const expectEmpty = async () => {
    expect(await t.prisma.vulnerability.count()).toBe(0);
    expect(await t.prisma.import.count()).toBe(0);
    expect(await t.prisma.historyEntry.count()).toBe(0);
  };

  it('imports a real report with deadlines and history', async () => {
    const { body } = await upload(real).expect(201);
    expect(body).toMatchObject({
      ...counts(13, 0, 0),
      fileName: 'raport.json',
      authorId: devId,
    });
    const all = await t.prisma.vulnerability.findMany({
      include: { history: true },
    });
    expect(all).toHaveLength(13);
    for (const v of all) {
      expect(v.status).toBe('NEW');
      expect(v.history).toMatchObject([
        {
          authorId: devId,
          importId: body.id,
          fromStatus: null,
          toStatus: 'NEW',
        },
      ]);
    }
    const critical = all.find((v) => v.severity === 'CRITICAL')!;
    expect(critical.dueAt!.getTime() - critical.detectedAt.getTime()).toBe(
      7 * 24 * 60 * 60 * 1000,
    );
  });

  it('skips everything when the same file is imported again', async () => {
    await upload(real).expect(201);
    expect((await upload(real).expect(201)).body).toMatchObject(
      counts(0, 0, 13),
    );
    expect(await t.prisma.vulnerability.count()).toBe(13);
    expect(await t.prisma.historyEntry.count()).toBe(13);
  });

  it('creates no duplicates when the same file is imported in parallel', async () => {
    const responses = await Promise.all([
      upload(real),
      upload(real),
      upload(real),
    ]);
    expect(responses.map((r) => r.status)).toEqual([201, 201, 201]);
    expect(
      responses.reduce((sum, r) => sum + (r.body.createdCount as number), 0),
    ).toBe(13);
    expect(await t.prisma.vulnerability.count()).toBe(13);
  });

  it('reopens a closed vulnerability with a new deadline', async () => {
    await upload(report([{ ...advisory, severity: 'low' }])).expect(201);
    const old = new Date('2026-01-01T00:00:00Z');
    await t.prisma.vulnerability.updateMany({
      data: { status: 'CLOSED', detectedAt: old, dueAt: old },
    });
    const { body } = await upload(report([advisory])).expect(201);
    expect(body).toMatchObject(counts(0, 1, 0));
    const v = await t.prisma.vulnerability.findFirstOrThrow();
    expect(v).toMatchObject({ status: 'NEW', severity: 'HIGH' });
    expect(v.detectedAt.getTime()).toBeGreaterThan(old.getTime());
    expect(v.dueAt!.getTime() - v.detectedAt.getTime()).toBe(
      14 * 24 * 60 * 60 * 1000,
    );
    expect(
      await t.prisma.historyEntry.findFirst({ where: { importId: body.id } }),
    ).toMatchObject({
      fromStatus: 'CLOSED',
      toStatus: 'NEW',
    });
  });

  it.each(['IN_PROGRESS', 'RISK_ACCEPTED'] as const)(
    'leaves %s unchanged',
    async (status) => {
      await upload(report([advisory])).expect(201);
      await t.prisma.vulnerability.updateMany({ data: { status } });
      const before = await t.prisma.vulnerability.findMany();
      expect(
        (await upload(report([{ ...advisory, severity: 'low' }])).expect(201))
          .body,
      ).toMatchObject(counts(0, 0, 1));
      expect(await t.prisma.vulnerability.findMany()).toEqual(before);
    },
  );

  it('keeps projects separate', async () => {
    const other = await t.prisma.project.create({ data: { name: 'Other' } });
    await upload(real).expect(201);
    expect((await upload(real, other.id).expect(201)).body).toMatchObject(
      counts(13, 0, 0),
    );
  });

  it('changes nothing for an invalid file, even when only one entry is wrong', async () => {
    await upload(Buffer.from('{')).expect(400);
    await upload(report([advisory, { ...advisory, severity: 'bad' }])).expect(
      400,
    );
    await expectEmpty();
  });

  it('rolls back when saving fails halfway', async () => {
    await t.prisma
      .$executeRaw`ALTER TABLE "HistoryEntry" ADD CONSTRAINT test_fail CHECK (false) NOT VALID`;
    try {
      await upload(real).expect(500);
    } finally {
      await t.prisma
        .$executeRaw`ALTER TABLE "HistoryEntry" DROP CONSTRAINT test_fail`;
    }
    await expectEmpty();
  });

  it('rejects a missing file, oversized file, archived or unknown project and no session', async () => {
    await t
      .http()
      .post(`/api/projects/${projectId}/imports`)
      .set('Cookie', dev)
      .expect(400);
    await upload(Buffer.alloc(2 * 1024 * 1024 + 1, ' ')).expect(413);
    await upload(real, '00000000-0000-4000-8000-000000000000').expect(404);
    await t.prisma.project.update({
      where: { id: projectId },
      data: { archivedAt: new Date() },
    });
    await upload(real).expect(409);
    await t.http().post(`/api/projects/${projectId}/imports`).expect(401);
    await expectEmpty();
  });

  it('handles a report close to the size limit', async () => {
    const total = 15_000;
    const large = report(
      Array.from({ length: total }, (_, i) => ({ ...advisory, source: i + 1 })),
    );
    expect(large.length).toBeGreaterThan(1024 * 1024);
    expect(large.length).toBeLessThanOrEqual(2 * 1024 * 1024);
    expect((await upload(large).expect(201)).body).toMatchObject(
      counts(total, 0, 0),
    );
    await t.prisma.vulnerability.updateMany({ data: { status: 'CLOSED' } });
    expect((await upload(large).expect(201)).body).toMatchObject(
      counts(0, total, 0),
    );
  }, 60_000);
});
