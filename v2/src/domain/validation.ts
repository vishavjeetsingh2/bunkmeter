import { MAX_CLASSES, type AttendanceInput } from './attendance';

export interface AttendanceFields { attended: string; total: string; target: string; remaining: string }
export type FieldName = keyof AttendanceFields;
export type FieldIssue = { kind: 'required' | 'invalid'; message: string };
export type ParsedAttendance =
  | { valid: true; value: AttendanceInput }
  | { valid: false; issues: Partial<Record<FieldName, FieldIssue>> };

/** Validate complete strings; do not parseInt, coerce blanks to zero or accept exponent syntax. */
export function parseAttendance(fields: AttendanceFields): ParsedAttendance {
  const issues: Partial<Record<FieldName, FieldIssue>> = {};
  function count(name: 'attended' | 'total' | 'remaining', optional = false): number | null {
    const text = fields[name].trim();
    if (!text) {
      if (!optional) issues[name] = { kind: 'required', message: 'Enter a class count, including 0 if none.' };
      return null;
    }
    if (text.length > 32 || !/^\d+$/.test(text) || Number(text) > MAX_CLASSES) {
      issues[name] = { kind: 'invalid', message: 'Use a whole number from 0 to 1,000,000,000.' };
      return null;
    }
    return Number(text);
  }
  const attended = count('attended');
  const total = count('total');
  const remaining = count('remaining', true);
  const targetText = fields.target.trim();
  let targetBasisPoints = 0;
  if (!targetText) issues.target = { kind: 'required', message: 'Enter your required percentage.' };
  else if (targetText.length > 16 || !/^\d+(?:\.\d{1,2})?$/.test(targetText)) {
    issues.target = { kind: 'invalid', message: 'Use 0–100%, with up to two decimal places.' };
  } else {
    const [whole = '0', decimals = ''] = targetText.split('.');
    targetBasisPoints = Number(whole) * 100 + Number(decimals.padEnd(2, '0'));
    if (targetBasisPoints > 10_000) issues.target = { kind: 'invalid', message: 'The target cannot exceed 100%.' };
  }
  if (attended !== null && total !== null && attended > total) {
    issues.attended = { kind: 'invalid', message: 'Attended classes cannot exceed classes held.' };
  }
  if (Object.keys(issues).length || attended === null || total === null) return { valid: false, issues };
  return { valid: true, value: { attended, total, targetBasisPoints, remaining } };
}
