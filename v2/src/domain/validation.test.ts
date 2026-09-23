import { describe, expect, it } from 'vitest';
import { parseAttendance, type AttendanceFields } from './validation';

const valid: AttendanceFields = { attended: '80', total: '100', target: '75', remaining: '' };
describe('strict form parsing', () => {
  it.each(['8.9', '8e2', '1e3', '-1', '+1', 'Infinity', 'NaN', '1,000', '1 0', '10abc', '9007199254740993', '1000000001', '0'.repeat(33)])('rejects count %s without truncation', text => {
    for (const field of ['attended', 'total', 'remaining']) expect(parseAttendance({ ...valid, [field]: text }).valid).toBe(false);
  });
  it.each(['', ' ', '100.01', '111', '-1', '75.001', '7e1', '.75', '75%', '75.', 'Infinity'])('rejects threshold %s', target => {
    expect(parseAttendance({ ...valid, target }).valid).toBe(false);
  });
  it('keeps blank required fields distinct from zero and unknown remaining distinct from zero', () => {
    expect(parseAttendance({ ...valid, attended: '' }).valid).toBe(false);
    expect(parseAttendance({ ...valid, total: '' }).valid).toBe(false);
    expect(parseAttendance({ ...valid, attended: '0', remaining: '0' })).toEqual({ valid: true, value: { attended: 0, total: 100, targetBasisPoints: 7500, remaining: 0 } });
    expect(parseAttendance(valid)).toEqual({ valid: true, value: { attended: 80, total: 100, targetBasisPoints: 7500, remaining: null } });
  });
  it.each([['0', 0], ['100', 10000], ['81', 8100], ['66.67', 6667], ['75.5', 7550], [' 75.05 ', 7505]])('parses threshold %s exactly', (target, expected) => {
    const parsed = parseAttendance({ ...valid, target: String(target) });
    expect(parsed.valid && parsed.value.targetBasisPoints).toBe(expected);
  });
  it('rejects inconsistent counts and accepts explicit zero records', () => {
    expect(parseAttendance({ ...valid, attended: '101' }).valid).toBe(false);
    expect(parseAttendance({ ...valid, attended: '0', total: '0' }).valid).toBe(true);
  });
});
