import { describe, expect, it } from 'vitest';
import { MAX_CLASSES, type AttendanceInput } from '../../domain/attendance';
import type { AttendanceFields } from '../../domain/validation';
import { applyClass, projectClasses, type ClassKind } from './class-actions';

const fields: AttendanceFields = { attended: '8', total: '10', target: ' 75.05 ', remaining: '' };
const input: AttendanceInput = { attended: 8, total: 10, targetBasisPoints: 7505, remaining: null };

describe('session class actions', () => {
  it.each(['present', 'absent'] as const)('counts a first %s class from explicit zeros', kind => {
    expect(applyClass({ ...fields, attended: '0', total: '0' }, kind)).toEqual({
      ...fields, attended: kind === 'present' ? '1' : '0', total: '1',
    });
  });

  it('preserves the exact target and unknown remaining text without mutating the source', () => {
    const original = Object.freeze({ ...fields, remaining: '  ' });
    expect(applyClass(original, 'present')).toEqual({ ...original, total: '11', attended: '9' });
    expect(original).toEqual({ ...fields, remaining: '  ' });
  });

  it('consumes the last known class and blocks further actions', () => {
    const next = applyClass({ ...fields, remaining: '1' }, 'absent');
    expect(next).toEqual({ ...fields, total: '11', remaining: '0' });
    expect(applyClass(next!, 'present')).toBeNull();
  });

  it('allows the maximum class count exactly, then refuses both action kinds', () => {
    const next = applyClass({ ...fields, attended: String(MAX_CLASSES - 1), total: String(MAX_CLASSES - 1) }, 'present');
    expect(next?.total).toBe(String(MAX_CLASSES));
    expect(next?.attended).toBe(String(MAX_CLASSES));
    expect(applyClass(next!, 'present')).toBeNull();
    expect(applyClass(next!, 'absent')).toBeNull();
  });

  it.each([
    { attended: '' }, { total: '10.5' }, { attended: '11' }, { remaining: '-1' },
    { target: '100.01' }, { total: '1e2' }, { remaining: '0' }, { attended: undefined },
  ])('rejects invalid or exhausted form records: %j', change => {
    expect(applyClass({ ...fields, ...change } as AttendanceFields, 'present')).toBeNull();
  });
});

describe('class projections', () => {
  it.each(['present', 'absent'] as const)('projects %s classes and preserves the target', kind => {
    const original = Object.freeze({ ...input, remaining: 5 });
    expect(projectClasses(original, kind, 5)).toEqual({
      ...input, total: 15, attended: kind === 'present' ? 13 : 8, remaining: 0,
    });
    expect(original).toEqual({ ...input, remaining: 5 });
  });

  it('distinguishes unknown remaining classes from a completed term', () => {
    expect(projectClasses(input, 'absent', 20)).toEqual({ ...input, total: 30 });
    expect(projectClasses({ ...input, remaining: 0 }, 'present', 1)).toBeNull();
    expect(projectClasses({ ...input, remaining: 2 }, 'present', 3)).toBeNull();
    expect(projectClasses({ ...input, remaining: 0 }, 'present', 0)).toEqual({ ...input, remaining: 0 });
  });

  it('allows a projection to the maximum, including from an empty record', () => {
    const empty = { ...input, total: 0, attended: 0 };
    expect(projectClasses(empty, 'present', MAX_CLASSES)).toEqual({ ...empty, total: MAX_CLASSES, attended: MAX_CLASSES });
    expect(projectClasses(input, 'present', MAX_CLASSES)).toBeNull();
    expect(projectClasses({ ...empty, total: MAX_CLASSES }, 'absent', 0)?.total).toBe(MAX_CLASSES);
  });

  it.each([-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])('rejects an invalid projection count %s', count => {
    expect(projectClasses(input, 'present', count)).toBeNull();
  });

  it.each([
    { attended: 11 }, { total: -1 }, { attended: 0.5 }, { total: MAX_CLASSES + 1 },
    { total: NaN }, { remaining: Infinity }, { remaining: undefined },
    { targetBasisPoints: -1 }, { targetBasisPoints: 10001 }, { targetBasisPoints: 7500.5 },
  ])('rejects malformed numeric input: %j', change => {
    expect(projectClasses({ ...input, ...change } as AttendanceInput, 'absent', 0)).toBeNull();
  });

  it('rejects invalid action kinds and missing runtime records', () => {
    expect(projectClasses(input, 'unknown' as ClassKind, 1)).toBeNull();
    expect(applyClass(fields, 'unknown' as ClassKind)).toBeNull();
    expect(projectClasses(null as unknown as AttendanceInput, 'present', 1)).toBeNull();
    expect(applyClass(null as unknown as AttendanceFields, 'present')).toBeNull();
  });
});
