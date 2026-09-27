import { describe, expect, it } from 'vitest';
import { calculateAttendance as calculate, MAX_CLASSES } from './attendance';

const result = (a: number, t: number, q = 7500, r: number | null = null) =>
  calculate({ attended: a, total: t, targetBasisPoints: q, remaining: r });

describe('audited calculation regressions', () => {
  it.each([
    [405, 450, 8100, 50n], [7, 7, 700, 93n], [29, 50, 5800, 0n],
    [90, 120, 7500, 0n], [100, 100, 10_000, 0n],
  ])('correct allowance for %i/%i at %i basis points', (a, t, q, expected) => {
    expect(result(a, t, q).canMiss).toBe(expected);
  });
  it.each([
    [0, 102, 9900, 10098n], [0, 10001, 5000, 10001n], [0, 10000, 5000, 10000n],
    [0, 1_000_000, 7500, 3_000_000n], [60, 120, 7500, 120n],
    [70, 100, 8000, 50n], [70, 100, 8500, 100n], [29, 50, 5800, 0n],
    [0, MAX_CLASSES, 9999, 9_999_000_000_000n],
  ])('constant-time recovery for %i/%i at %i basis points', (a, t, q, expected) => {
    expect(result(a, t, q).mustAttend).toBe(expected);
  });
  it('handles the fixed-total ceil boundaries implicated in the removed condonation tool', () => {
    expect(result(240, 300, 8100).requiredAtCurrentTotal).toBe(243n);
    expect(result(0, 100, 700).requiredAtCurrentTotal).toBe(7n);
    // These are counted lectures required, not calendar days or permission for leave.
  });
  it('distinguishes exact equality from rounded display', () => {
    expect(result(29, 50, 5800).state).toBe('at-target');
    expect(result(7499, 10000).percentage).toBe('74.99');
    expect(result(7499, 10000).state).toBe('recovery');
    expect(result(2, 3, 6667).percentage).toBe('66.66');
    expect(result(2, 3, 6667).mustAttend).toBe(1n);
  });
  it('separates 100% impossibility from insufficient remaining classes', () => {
    expect(result(9, 10, 10_000).state).toBe('perfect-unreachable');
    expect(result(9, 10, 10_000).mustAttend).toBeNull();
    expect(result(60, 120, 7500, 119).state).toBe('unreachable');
    expect(result(60, 120, 7500, 120).state).toBe('recovery');
  });
  it('separates zero remaining from unknown and caps allowance', () => {
    expect(result(80, 100, 7500, 0).canMiss).toBe(0n);
    expect(result(80, 100).canMiss).toBe(6n);
    expect(result(100, 100, 7500, 33).canMiss).toBe(33n);
    expect(result(74, 100, 7500, 0).state).toBe('unreachable');
  });
  it('distinguishes consecutive budget from remaining-term budget', () => {
    const plan = result(75, 100, 7500, 100);
    expect(plan.canMiss).toBe(0n);
    expect(plan.semester).toEqual({ bestPercentage: '87.50', required: 75n, canMiss: 25n, reachable: true });
  });
  it('has explicit no-record and zero-target states', () => {
    expect(result(0, 0).percentage).toBeNull();
    expect(result(0, 0).state).toBe('empty');
    expect(result(0, 0, 7500, 4).semester?.required).toBe(3n);
    expect(result(0, 0, 7500, 0).semester?.bestPercentage).toBeNull();
    expect(result(0, 100, 0).canMiss).toBeNull();
    expect(result(0, 100, 0, 12).canMiss).toBe(12n);
  });
  it('does not mutate input or retain old results after clearing', () => {
    const input = Object.freeze({ attended: 80, total: 100, targetBasisPoints: 7500, remaining: null });
    expect(calculate(input).percentage).toBe('80.00');
    expect(result(0, 0).percentage).toBeNull();
    expect(calculate(input).percentage).toBe('80.00');
  });
  it.each([NaN, Infinity, -1, 0.5, MAX_CLASSES + 1, Number.MAX_SAFE_INTEGER + 1])('rejects invalid domain counts %s', count => {
    expect(() => result(count, count)).toThrow(RangeError);
    expect(() => result(0, 0, 7500, count)).toThrow(RangeError);
  });
  it.each([NaN, Infinity, -1, 10001, 7500.5])('rejects invalid domain thresholds %s', q => {
    expect(() => result(0, 1, q)).toThrow(RangeError);
  });
  it('rejects attended greater than total', () => expect(() => result(11, 10)).toThrow(RangeError));
});

describe('independent boundary oracle', () => {
  it('checks 324,800 count/threshold combinations against exact inequalities', () => {
    const thresholds = [0, 1, 700, 5000, 5800, 6000, 6500, 6667, 7000, 7500, 8000, 8100, 8500, 9000, 9900, 10000];
    let checked = 0;
    for (let total = 1; total <= 200; total++) {
      for (let attended = 0; attended <= total; attended++) {
        for (const target of thresholds) {
          const answer = result(attended, total, target);
          const a = BigInt(attended), t = BigInt(total), q = BigInt(target);
          // The oracle asks whether the answer works and the adjacent answer fails.
          if (10000n * a >= q * t && q > 0n) {
            const n = answer.canMiss!;
            if (!(10000n * a >= q * (t + n) && 10000n * a < q * (t + n + 1n))) throw new Error(`Allowance ${attended}/${total}/${target}`);
          } else if (10000n * a < q * t && q < 10000n) {
            const n = answer.mustAttend!;
            if (!(10000n * (a + n) >= q * (t + n) && 10000n * (a + n - 1n) < q * (t + n - 1n))) throw new Error(`Recovery ${attended}/${total}/${target}`);
          }
          checked++;
        }
      }
    }
    expect(checked).toBe(324800);
  });
  it('matches enumeration of every remaining-term option in small domains', () => {
    for (let t = 0; t <= 20; t++) for (let a = 0; a <= t; a++) {
      for (let r = 0; r <= 15; r++) for (const q of [0, 5800, 7500, 8100, 9999, 10000]) {
        const options = Array.from({ length: r + 1 }, (_, present) => present)
          .filter(present => 10000 * (a + present) >= q * (t + r));
        const semester = result(a, t, q, r).semester!;
        expect(semester.reachable).toBe(options.length > 0);
        if (options.length) {
          expect(semester.required).toBe(BigInt(options[0]!));
          expect(semester.canMiss).toBe(BigInt(r - options[0]!));
        } else expect(semester.canMiss).toBeNull();
      }
    }
  });
});
