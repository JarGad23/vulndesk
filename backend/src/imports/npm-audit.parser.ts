import { Injectable } from '@nestjs/common';
import type { Severity } from '../generated/prisma/client.js';
import {
  type Finding,
  InvalidReportError,
  ReportParser,
} from './report-parser.js';

const SEVERITIES: Record<string, Severity> = {
  info: 'INFO',
  low: 'LOW',
  moderate: 'MODERATE',
  high: 'HIGH',
  critical: 'CRITICAL',
};
const SEVERITY_ORDER: Severity[] = [
  'INFO',
  'LOW',
  'MODERATE',
  'HIGH',
  'CRITICAL',
];

type JsonObject = Record<string, unknown>;

@Injectable()
export class NpmAuditParser extends ReportParser {
  parse(content: string): Finding[] {
    const report = this.parseJson(content);
    if (report.auditReportVersion !== 2 || !isObject(report.vulnerabilities)) {
      throw new InvalidReportError('To nie jest raport npm audit w wersji 2.');
    }
    const findings = new Map<string, Finding>();
    for (const entry of Object.values(report.vulnerabilities)) {
      if (!isObject(entry) || !Array.isArray(entry.via)) {
        throw new InvalidReportError('Raport zawiera nieprawidłowy wpis.');
      }
      for (const via of entry.via as unknown[]) {
        // A string names another entry of the report, which holds the advisory itself.
        if (typeof via === 'string') continue;
        const finding = this.toFinding(via);
        const key = JSON.stringify([finding.packageName, finding.advisoryId]);
        const known = findings.get(key);
        findings.set(key, known ? merge(known, finding) : finding);
      }
    }
    return [...findings.values()];
  }

  private parseJson(content: string): JsonObject {
    let value: unknown;
    try {
      value = JSON.parse(content.replace(/^﻿/, ''));
    } catch {
      throw new InvalidReportError('Plik nie jest poprawnym JSON-em.');
    }
    if (!isObject(value))
      throw new InvalidReportError('To nie jest raport npm audit w wersji 2.');
    return value;
  }

  private toFinding(via: unknown): Finding {
    if (!isObject(via))
      throw new InvalidReportError('Raport zawiera nieprawidłowy wpis.');
    const severity = Object.hasOwn(SEVERITIES, String(via.severity))
      ? SEVERITIES[String(via.severity)]
      : undefined;
    if (!severity || !Number.isSafeInteger(via.source)) {
      throw new InvalidReportError('Raport zawiera nieprawidłowy wpis.');
    }
    const url = safeUrl(via.url);
    // npm gives one advisory several source numbers, one per version range; GHSA is stable.
    const ghsa = url?.match(/\/(GHSA(?:-[a-z0-9]{4}){3})$/i)?.[1];
    return {
      packageName: text(via.name, 214),
      advisoryId: ghsa ?? `npm-${String(via.source as number)}`,
      title: text(via.title, 500),
      url,
      severity,
      affectedRange: text(via.range, 1000),
    };
  }
}

function merge(a: Finding, b: Finding): Finding {
  const ranges = new Set([
    ...a.affectedRange.split(' || '),
    ...b.affectedRange.split(' || '),
  ]);
  const severity =
    SEVERITY_ORDER.indexOf(b.severity) > SEVERITY_ORDER.indexOf(a.severity)
      ? b.severity
      : a.severity;
  return { ...a, severity, affectedRange: [...ranges].join(' || ') };
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown, maxLength: number): string {
  // PostgreSQL text cannot store NUL.
  if (
    typeof value !== 'string' ||
    value === '' ||
    value.length > maxLength ||
    value.includes('\0')
  ) {
    throw new InvalidReportError('Raport zawiera nieprawidłowy wpis.');
  }
  return value;
}

/** Only https links are kept, because the UI renders them as anchors. */
function safeUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2000 || !URL.canParse(value))
    return null;
  const url = new URL(value);
  return url.protocol === 'https:' ? url.href : null;
}
