import { describe, expect, it } from 'vitest';
import { calculateAttendance, type AttendanceInput } from '../../domain/attendance';
import { attendanceStatus, classMilestones } from './presentation';

const input: AttendanceInput = { attended: 27, total: 48, targetBasisPoints: 7500, remaining: null };
describe('exact visual milestones', () => {
  it('shows cumulative attendance, not three additional runs', () => {
    expect(classMilestones(input, 36n, true)).toEqual([
      { classes: 12n, attended: 39n, total: 60n, percentage: '65.00' },
      { classes: 24n, attended: 51n, total: 72n, percentage: '70.83' },
      { classes: 36n, attended: 63n, total: 84n, percentage: '75.00' },
    ]);
  });
  it.each([0n, 1n, 2n, 3n, 4n, 9999000000000n, 999999999999999999n])('keeps %s classes exact, unique and bounded to three milestones', run => {
    const steps = classMilestones(input, run, true);
    expect(steps.length).toBe(Number(run < 3n ? run : 3n));
    expect(new Set(steps.map(step => step.classes)).size).toBe(steps.length);
    if (run > 0n) expect(steps.at(-1)?.total).toBe(48n + run);
    steps.forEach((step, index) => expect(step.classes).toBeGreaterThan(steps[index - 1]?.classes ?? 0n));
  });
  it('does not add attendance for missed-class milestones', () => {
    const steps = classMilestones({ ...input, attended: 90, total: 110 }, 10n, false);
    expect(steps.at(-1)).toEqual({ classes: 10n, attended: 90n, total: 120n, percentage: '75.00' });
  });
});
describe('shared status language', () => {
  it.each([
    [{ ...input }, 'Recovery needed'],
    [{ ...input, remaining: 0 }, 'Term complete · below target'],
    [{ ...input, remaining: 35 }, 'Target out of reach'],
    [{ ...input, targetBasisPoints: 10000 }, 'Target out of reach'],
    [{ ...input, targetBasisPoints: 0 }, 'No minimum'],
    [{ ...input, attended: 0, total: 0 }, 'No classes yet'],
    [{ ...input, attended: 36 }, 'No skip buffer'],
    [{ ...input, attended: 48 }, 'Safe · on track'],
    [{ ...input, attended: 48, remaining: 0 }, 'Term complete · target met'],
  ] as const)('describes the engine state without invented risk thresholds', (value, label) => {
    expect(attendanceStatus(value, calculateAttendance(value)).label).toBe(label);
  });
});
