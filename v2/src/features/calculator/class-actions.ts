import { MAX_CLASSES, type AttendanceInput } from '../../domain/attendance';
import { parseAttendance, type AttendanceFields } from '../../domain/validation';

export type ClassKind = 'present' | 'absent';

/** Project whole counted classes; never change the original record. */
export function projectClasses(input: AttendanceInput, kind: ClassKind, count: number): AttendanceInput | null {
  if (!input || (kind !== 'present' && kind !== 'absent') || !Number.isSafeInteger(count) || count < 0) return null;
  const counts = [input.attended, input.total, ...(input.remaining === null ? [] : [input.remaining])];
  if (counts.some(value => !Number.isSafeInteger(value) || value < 0 || value > MAX_CLASSES)
    || input.attended > input.total
    || !Number.isInteger(input.targetBasisPoints) || input.targetBasisPoints < 0 || input.targetBasisPoints > 10_000
    || (input.targetRule !== undefined && (input.targetRule !== 'two-thirds' || input.targetBasisPoints !== 6667))
    || count > MAX_CLASSES - input.total
    || (input.remaining !== null && count > input.remaining)) return null;

  return {
    ...input,
    total: input.total + count,
    attended: input.attended + (kind === 'present' ? count : 0),
    remaining: input.remaining === null ? null : input.remaining - count,
  };
}

/** Apply one session action only when every field describes a valid attendance record. */
export function applyClass(fields: AttendanceFields, kind: ClassKind): AttendanceFields | null {
  if (!fields || ['attended', 'total', 'target', 'remaining'].some(key => typeof fields[key as keyof AttendanceFields] !== 'string')) return null;
  const parsed = parseAttendance(fields);
  if (!parsed.valid) return null;
  const next = projectClasses(parsed.value, kind, 1);
  if (!next) return null;
  return {
    ...fields,
    total: String(next.total),
    attended: String(next.attended),
    remaining: next.remaining === null ? fields.remaining : String(next.remaining),
  };
}
