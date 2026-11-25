import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  Import,
  Prisma,
  VulnerabilityStatus,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { dueDate } from '../vulnerabilities/sla.js';
import {
  type Finding,
  InvalidReportError,
  ReportParser,
} from './report-parser.js';

const CHUNK = 1000;

interface ImportInput {
  projectId: string;
  authorId: string;
  fileName: string;
  content: string;
}

@Injectable()
export class ImportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parser: ReportParser,
  ) {}

  async import({ content, ...input }: ImportInput): Promise<Import> {
    const findings = this.parse(content);
    return this.prisma.$transaction((tx) => this.save(tx, input, findings), {
      timeout: 20_000,
      maxWait: 10_000,
    });
  }

  private parse(content: string): Finding[] {
    try {
      return this.parser.parse(content);
    } catch (error) {
      if (error instanceof InvalidReportError)
        throw new BadRequestException(error.message);
      throw error;
    }
  }

  private async save(
    tx: Prisma.TransactionClient,
    { projectId, authorId, fileName }: Omit<ImportInput, 'content'>,
    findings: Finding[],
  ): Promise<Import> {
    await this.lockActiveProject(tx, projectId);

    const existing = await tx.vulnerability.findMany({
      where: { projectId },
      select: { id: true, packageName: true, advisoryId: true, status: true },
    });
    const known = new Map(existing.map((v) => [key(v), v]));
    const detectedAt = new Date();

    const created = findings
      .filter((f) => !known.has(key(f)))
      .map((f) => ({
        ...f,
        id: randomUUID(),
        projectId,
        detectedAt,
        dueAt: dueDate(f.severity, detectedAt),
      }));
    const reopened = findings.flatMap((f) => {
      const match = known.get(key(f));
      return match?.status === 'CLOSED'
        ? [{ ...f, id: match.id, dueAt: dueDate(f.severity, detectedAt) }]
        : [];
    });

    for (const part of chunks(created))
      await tx.vulnerability.createMany({ data: part });
    for (const part of chunks(reopened))
      await this.reopen(tx, part, detectedAt);

    const record = await tx.import.create({
      data: {
        projectId,
        authorId,
        fileName,
        createdCount: created.length,
        reopenedCount: reopened.length,
        skippedCount: findings.length - created.length - reopened.length,
      },
    });
    const entry = (
      vulnerabilityId: string,
      fromStatus: VulnerabilityStatus | null,
    ) => ({
      vulnerabilityId,
      authorId,
      importId: record.id,
      fromStatus,
      toStatus: 'NEW' as const,
    });
    const history = [
      ...created.map((v) => entry(v.id, null)),
      ...reopened.map((v) => entry(v.id, 'CLOSED')),
    ];
    for (const part of chunks(history))
      await tx.historyEntry.createMany({ data: part });
    return record;
  }

  /** One statement for many rows: a large report would exceed the transaction timeout row by row. */
  private async reopen(
    tx: Prisma.TransactionClient,
    items: (Finding & { id: string; dueAt: Date | null })[],
    detectedAt: Date,
  ): Promise<void> {
    await tx.$executeRaw`
      UPDATE "Vulnerability" AS v SET
        "status" = 'NEW', "detectedAt" = ${detectedAt}::timestamptz, "dueAt" = r."dueAt",
        "severity" = r."severity"::"Severity", "title" = r."title", "url" = r."url", "affectedRange" = r."affectedRange"
      FROM jsonb_to_recordset(${JSON.stringify(items)}::jsonb)
        AS r("id" uuid, "dueAt" timestamptz, "severity" text, "title" text, "url" text, "affectedRange" text)
      WHERE v."id" = r."id"`;
  }

  /** The row lock serializes imports into one project and excludes archiving meanwhile. */
  private async lockActiveProject(
    tx: Prisma.TransactionClient,
    projectId: string,
  ): Promise<void> {
    const [project] = await tx.$queryRaw<{ archivedAt: Date | null }[]>`
      SELECT "archivedAt" FROM "Project" WHERE "id" = ${projectId}::uuid FOR UPDATE`;
    if (!project) throw new NotFoundException('Nie znaleziono projektu.');
    if (project.archivedAt)
      throw new ConflictException('Projekt jest zarchiwizowany.');
  }
}

function key({
  packageName,
  advisoryId,
}: {
  packageName: string;
  advisoryId: string;
}): string {
  return JSON.stringify([packageName, advisoryId]);
}

function chunks<T>(items: T[]): T[][] {
  return Array.from({ length: Math.ceil(items.length / CHUNK) }, (_, i) =>
    items.slice(i * CHUNK, (i + 1) * CHUNK),
  );
}
