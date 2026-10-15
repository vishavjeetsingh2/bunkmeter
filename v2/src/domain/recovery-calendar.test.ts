import { describe, expect, it } from 'vitest';
import { localDate, recoveryCalendar } from './recovery-calendar';
const input = { attended: 72, total: 100, targetBasisPoints: 7500, remaining: null };
const settings = { start: '2026-10-19', weekdays: [1, 3, 5], perDay: 2 };
describe('recovery calendar', () => {
  it('maps exact recovery to selected class days without changing attendance', () => {
    const plan = recoveryCalendar(input, settings);
    expect(plan.needed).toBe(12n); expect(plan.days).toHaveLength(6);
    expect(plan.days.at(-1)).toEqual({ date: '2026-10-30', classes: 2, attended: 84, total: 112, percentage: '75.00' });
    expect(plan.complete).toBe(true); expect(input.attended).toBe(72);
  });
  it('handles partial last days and year boundaries', () => {
    const plan = recoveryCalendar(input, { start: '2026-12-31', weekdays: [0,1,2,3,4,5,6], perDay: 5 });
    expect(plan.days.map(day => day.classes)).toEqual([5,5,2]);
    expect(plan.days.at(-1)?.date).toBe('2027-01-02');
  });
  it('does not invent a recovery date for impossible or enormous runs', () => {
    expect(recoveryCalendar({ ...input, targetBasisPoints: 10000 }, settings).days).toEqual([]);
    expect(recoveryCalendar({ ...input, remaining: 10 }, settings).days).toEqual([]);
    const plan = recoveryCalendar({ ...input, attended: 0, targetBasisPoints: 9999 }, settings);
    expect(plan.complete).toBe(false); expect(plan.days.length).toBeLessThanOrEqual(180);
  });
  it('rejects bad dates and schedules', () => {
    expect(() => localDate('2026-02-30')).toThrow();
    expect(() => recoveryCalendar(input, { ...settings, weekdays: [] })).toThrow();
    expect(() => recoveryCalendar(input, { ...settings, perDay: 1.5 })).toThrow();
    expect(recoveryCalendar({ ...input, attended: 100 }, settings).days).toEqual([]);
  });
  it('moves recovery past excluded holidays without counting them', () => {
    const plan = recoveryCalendar(input, { ...settings, excluded: ['2026-10-19'] });
    expect(plan.days[0]?.date).toBe('2026-10-21');
    expect(plan.days.at(-1)?.date).toBe('2026-11-02');
    expect(plan.days.at(-1)?.percentage).toBe('75.00');
  });
});
