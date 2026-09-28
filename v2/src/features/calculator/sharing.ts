import { calculateAttendance, type AttendanceInput } from '../../domain/attendance';
import { parseAttendance, type AttendanceFields } from '../../domain/validation';

const keys = ['held', 'attended', 'req', 'remaining'] as const;
export function readAttendancePreset(search: string, defaults: AttendanceFields): { fields: AttendanceFields | null; invalid: boolean } {
  const params = new URLSearchParams(search);
  if (!keys.some(key => params.has(key))) return { fields: null, invalid: false };
  if (keys.some(key => params.getAll(key).length > 1)) return { fields: null, invalid: true };
  const fields = {
    total: params.get('held') ?? defaults.total, attended: params.get('attended') ?? defaults.attended,
    target: params.get('req') ?? defaults.target, remaining: params.get('remaining') ?? defaults.remaining,
  };
  const targetOnly = params.has('req') && !params.has('held') && !params.has('attended') && !params.has('remaining');
  const valid = parseAttendance(targetOnly ? { ...fields, total: '0', attended: '0' } : fields).valid;
  return { fields: valid ? fields : null, invalid: !valid };
}

export function createAttendanceShare(input: AttendanceInput, path = '/') {
  const result = calculateAttendance(input); // Validate through the same exact engine as the UI.
  const target = input.targetBasisPoints / 100;
  const url = new URL(['/', '/vtu', '/aktu', '/du'].includes(path) ? path : '/', 'https://bunkmeter.online');
  url.searchParams.set('held', String(input.total));
  url.searchParams.set('attended', String(input.attended));
  url.searchParams.set('req', String(target));
  if (input.remaining !== null) url.searchParams.set('remaining', String(input.remaining));
  let summary: string;
  if (result.state === 'empty') summary = `I have no classes recorded yet. My attendance target is ${target}%.`;
  else if (input.remaining === 0) summary = `My term is complete at ${result.percentage}% attendance, ${result.semester?.reachable ? 'meeting' : 'below'} my ${target}% target.`;
  else if (target === 0) summary = 'I have no minimum attendance target set.';
  else if (result.state === 'perfect-unreachable') summary = 'Exact 100% attendance cannot be recovered after a missed class.';
  else if (result.state === 'unreachable') summary = `My ${target}% attendance target is out of reach within the ${input.remaining} remaining classes.`;
  else if (result.state === 'recovery') summary = `I need ${result.mustAttend} consecutive ${result.mustAttend === 1n ? 'class' : 'classes'} to reach ${target}% attendance.`;
  else summary = result.canMiss === 0n ? `I cannot miss the next class and stay at ${target}% attendance.` : `I can miss ${result.canMiss} consecutive ${result.canMiss === 1n ? 'class' : 'classes'} and stay at or above ${target}% attendance.`;
  return { title: 'BunkMeter attendance result', summary, text: `${summary} Check yours: bunkmeter.online`, url: url.href };
}
