import type { Severity } from '../generated/prisma/client.js';

const DAY_MS = 24 * 60 * 60 * 1000;

const SLA_DAYS: Record<Severity, number | null> = {
  CRITICAL: 7,
  HIGH: 14,
  MODERATE: 30,
  LOW: 90,
  INFO: null,
};

export function dueDate(severity: Severity, detectedAt: Date): Date | null {
  const days = SLA_DAYS[severity];
  return days === null ? null : new Date(detectedAt.getTime() + days * DAY_MS);
}
