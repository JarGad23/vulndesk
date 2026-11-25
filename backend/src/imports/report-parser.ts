import type { Severity } from '../generated/prisma/client.js';

export interface Finding {
  packageName: string;
  advisoryId: string;
  title: string;
  url: string | null;
  severity: Severity;
  affectedRange: string;
}

/** Adapter for a scanner's report format. Supporting another scanner means another implementation. */
export abstract class ReportParser {
  /** Returns findings unique by package and advisory. Throws InvalidReportError. */
  abstract parse(content: string): Finding[];
}

export class InvalidReportError extends Error {}
