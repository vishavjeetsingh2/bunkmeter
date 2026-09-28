import { describe, expect, it } from 'vitest';
import { createAttendanceShare, readAttendancePreset } from './sharing';
import { parseAttendance } from '../../domain/validation';

const initial = { total: '', attended: '', target: '85', remaining: '' };
describe('attendance URL presets and share text', () => {
  it('loads counts and an explicit target without changing defaults', () => {
    expect(readAttendancePreset('?held=100&attended=72&req=75', initial)).toEqual({ fields: { total: '100', attended: '72', target: '75', remaining: '' }, invalid: false });
    expect(initial.target).toBe('85');
  });
  it('supports a target-only preset and page-default targets', () => {
    expect(readAttendancePreset('?req=90', initial).fields).toEqual({ ...initial, target: '90' });
    expect(readAttendancePreset('?held=100&attended=90', initial).fields?.target).toBe('85');
    expect(readAttendancePreset('?unrelated=value', initial)).toEqual({ fields: null, invalid: false });
  });
  it.each(['?held=100', '?held=100&attended=101', '?held=1.5&attended=1', '?held=1e3&attended=1', '?held=-1&attended=0', '?held=100&attended=72&req=101', '?held=100&attended=72&req=75&req=85', '?req=', '?remaining=2', '?held=1000000001&attended=1', '?req=%3Cscript%3E'])('rejects invalid or ambiguous parameters: %s', query => {
    expect(readAttendancePreset(query, initial)).toEqual({ fields: null, invalid: true });
  });
  it('round trips decimal targets, large counts and zero remaining exactly', () => {
    const input = { total: 1000000000, attended: 749900000, targetBasisPoints: 7499, remaining: 0 };
    const share = createAttendanceShare(input, '/vtu');
    const restored = readAttendancePreset(new URL(share.url).search, initial);
    expect(parseAttendance(restored.fields!)).toEqual({ valid: true, value: input });
    expect(new URL(share.url).pathname).toBe('/vtu');
  });
  it('uses the exact recovery result and only the intended public URL values', () => {
    const share = createAttendanceShare({ total: 100, attended: 72, targetBasisPoints: 7500, remaining: null }, '//untrusted.example');
    expect(share.url).toBe('https://bunkmeter.online/?held=100&attended=72&req=75');
    expect(share.summary).toBe('I need 12 consecutive classes to reach 75% attendance.');
  });
  it('does not present an impossible finite-term recovery as attainable', () => {
    const share = createAttendanceShare({ total: 100, attended: 72, targetBasisPoints: 7500, remaining: 10 });
    expect(share.summary).toContain('out of reach');
    expect(share.url).toContain('remaining=10');
  });
  it('handles zero, perfect, at-target and finished states without null values', () => {
    for (const input of [
      { total: 0, attended: 0, targetBasisPoints: 7500, remaining: null },
      { total: 10, attended: 9, targetBasisPoints: 10000, remaining: null },
      { total: 10, attended: 0, targetBasisPoints: 0, remaining: null },
      { total: 100, attended: 75, targetBasisPoints: 7500, remaining: null },
      { total: 100, attended: 75, targetBasisPoints: 7500, remaining: 0 },
    ]) expect(createAttendanceShare(input).text).not.toMatch(/null|undefined/);
  });
});
