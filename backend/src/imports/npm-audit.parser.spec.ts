import { readFileSync } from 'node:fs';
import { NpmAuditParser } from './npm-audit.parser.js';
import { InvalidReportError } from './report-parser.js';

const real = readFileSync(
  new URL('../../test/fixtures/npm-audit-v2.json', import.meta.url),
  'utf8',
);
const advisory = {
  source: 1,
  name: 'pkg',
  title: 'Bug',
  url: 'https://github.com/advisories/GHSA-aaaa-bbbb-cccc',
  severity: 'high',
  range: '<1.0.0',
};
const report = (...via: unknown[]) =>
  JSON.stringify({ auditReportVersion: 2, vulnerabilities: { pkg: { via } } });

describe('NpmAuditParser', () => {
  const parser = new NpmAuditParser();

  it('reads a real report, merging ranges and skipping transitive references', () => {
    const findings = parser.parse(real);
    expect(findings).toHaveLength(13);
    expect(findings.some((f) => f.packageName === 'mkdirp')).toBe(false);
    expect(
      findings.find((f) => f.advisoryId === 'GHSA-xvch-5gv4-984h'),
    ).toMatchObject({
      packageName: 'minimist',
      severity: 'CRITICAL',
      affectedRange: '<0.2.4 || >=1.0.0 <1.2.6',
    });
  });

  it('accepts a clean report and a BOM', () => {
    expect(
      parser.parse('﻿{"auditReportVersion":2,"vulnerabilities":{}}'),
    ).toEqual([]);
  });

  it('keeps the highest severity when merging', () => {
    const [finding] = parser.parse(
      report({ ...advisory, severity: 'low' }, { ...advisory, source: 2 }),
    );
    expect(finding.severity).toBe('HIGH');
  });

  it('drops unsafe links and falls back to the npm number', () => {
    const [finding] = parser.parse(
      report({ ...advisory, url: 'javascript:alert(1)' }),
    );
    expect(finding).toMatchObject({ url: null, advisoryId: 'npm-1' });
  });

  it.each([
    ['invalid JSON', '{'],
    ['null', 'null'],
    ['an array', '[]'],
    ['version 1', '{"auditReportVersion":1,"advisories":{}}'],
    ['an npm error', '{"error":{"code":"ENOLOCK"}}'],
    [
      'an entry without via',
      '{"auditReportVersion":2,"vulnerabilities":{"a":{}}}',
    ],
    ['a null via', report(null)],
    ['an unknown severity', report({ ...advisory, severity: 'constructor' })],
    ['a missing title', report({ ...advisory, title: undefined })],
    ['NUL', report({ ...advisory, title: 'a\0b' })],
    ['an oversized name', report({ ...advisory, name: 'x'.repeat(215) })],
  ])('rejects %s', (_, content) => {
    expect(() => parser.parse(content)).toThrow(InvalidReportError);
  });
});
