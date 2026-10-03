import { describe, it, expect } from 'vitest';
import { steppedCount } from './count-step';
const fields = { total: '10', attended: '10', target: '75', remaining: '' };
describe('manual count steppers', () => {
  it('never makes attended exceed held', () => {
    expect(steppedCount(fields, 'attended', 1)).toBeNull();
    expect(steppedCount(fields, 'total', -1)).toBeNull();
    expect(steppedCount(fields, 'total', 1)).toBe('11');
    expect(steppedCount(fields, 'attended', -1)).toBe('9');
  });
  it('preserves malformed inputs for correction and respects limits', () => {
    for (const value of ['1.5', '-1', 'abc', '1e2']) expect(steppedCount({ ...fields, total: value }, 'total', 1)).toBeNull();
    expect(steppedCount({ ...fields, total: '1000000000' }, 'total', 1)).toBeNull();
    expect(steppedCount({ ...fields, total: '0', attended: '0' }, 'total', -1)).toBeNull();
    expect(steppedCount(fields, 'remaining', 1)).toBe('1');
    expect(steppedCount({ ...fields, remaining: '1' }, 'remaining', -1)).toBe('0');
  });
});
