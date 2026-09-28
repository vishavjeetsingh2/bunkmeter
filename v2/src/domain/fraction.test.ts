import { describe, expect, it } from 'vitest';
import { calculateAttendance, type AttendanceInput } from './attendance';
import { parseAttendance } from './validation';
import { createAttendanceShare, readAttendancePreset } from '../features/calculator/sharing';
import { applyClass } from '../features/calculator/class-actions';

const fraction = (attended: number, total: number, remaining: number | null = null): AttendanceInput => ({ attended, total, remaining, targetBasisPoints: 6667, targetRule: 'two-thirds' });
describe('exact two-thirds targets', () => {
  it('does not substitute rounded percentages for a rational boundary', () => {
    expect(calculateAttendance(fraction(2, 3))).toMatchObject({ state: 'at-target', mustAttend: 0n, canMiss: 0n });
    expect(calculateAttendance({ ...fraction(2, 3), targetRule: undefined } as unknown as AttendanceInput).mustAttend).toBe(1n);
    expect(calculateAttendance(fraction(1, 3)).mustAttend).toBe(3n);
    expect(calculateAttendance(fraction(1, 3, 2)).state).toBe('unreachable');
    expect(calculateAttendance(fraction(1, 3, 3)).semester?.reachable).toBe(true);
  });
  it('matches an independent integer oracle for small records and finite terms', () => {
    for (let total = 1; total <= 40; total++) for (let attended = 0; attended <= total; attended++) {
      const actual = calculateAttendance(fraction(attended, total));
      let attend = 0; while (3 * (attended + attend) < 2 * (total + attend)) attend++;
      let miss = 0; while (3 * attended >= 2 * (total + miss + 1)) miss++;
      expect(actual.mustAttend).toBe(BigInt(attend)); expect(actual.canMiss).toBe(BigInt(miss));
      const term = calculateAttendance(fraction(attended, total, 7)).semester!;
      const candidates = Array.from({ length: 8 }, (_, i) => i).filter(i => 3 * (attended + i) >= 2 * (total + 7));
      expect(term.reachable).toBe(candidates.length > 0);
      if (candidates.length) expect(term.required).toBe(BigInt(candidates[0]!));
    }
  });
  it('round trips through URL presets and class actions', () => {
    const fields = { attended: '2', total: '3', target: '2/3', remaining: '' };
    const parsed = parseAttendance(fields); expect(parsed.valid).toBe(true); if (!parsed.valid) return;
    const share = createAttendanceShare(parsed.value, '/du');
    expect(share.summary).toContain('66⅔%');
    expect(readAttendancePreset(new URL(share.url).search, fields).fields).toEqual(fields);
    expect(applyClass(fields, 'present')).toEqual({ ...fields, attended: '3', total: '4' });
    expect(() => calculateAttendance({ ...fraction(2, 3), targetBasisPoints: 7500 })).toThrow();
  });
});
