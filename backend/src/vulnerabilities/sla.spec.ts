import { dueDate } from './sla.js';

describe('dueDate', () => {
  it.each([
    ['CRITICAL', '2026-01-08T10:00:00.000Z'],
    ['HIGH', '2026-01-15T10:00:00.000Z'],
    ['MODERATE', '2026-01-31T10:00:00.000Z'],
    ['LOW', '2026-04-01T10:00:00.000Z'],
  ] as const)('%s', (severity, expected) => {
    expect(
      dueDate(severity, new Date('2026-01-01T10:00:00Z'))?.toISOString(),
    ).toBe(expected);
  });

  it('has no deadline for INFO', () => {
    expect(dueDate('INFO', new Date())).toBeNull();
  });
});
