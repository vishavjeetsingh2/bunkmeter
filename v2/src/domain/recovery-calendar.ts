import { calculateAttendance, percentage, type AttendanceInput } from './attendance';

export type RecoveryDay = { date: string; classes: number; attended: number; total: number; percentage: string };
export type CalendarSettings = { start: string; weekdays: number[]; perDay: number; excluded?: string[] };
export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function localDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw Error('Choose a valid start date.');
  const [year, month, day] = value.split('-').map(Number) as [number, number, number];
  const date = new Date(year, month - 1, day, 12);
  if (dateKey(date) !== value) throw Error('Choose a valid start date.');
  return date;
}
/** A plan is a projection, never an attendance record. At most 180 calendar days. */
export function recoveryCalendar(input: AttendanceInput, settings: CalendarSettings) {
  const result = calculateAttendance(input);
  if (!settings.weekdays.length || settings.weekdays.some(day => !Number.isInteger(day) || day < 0 || day > 6)) throw Error('Choose at least one class day.');
  if (!Number.isInteger(settings.perDay) || settings.perDay < 1 || settings.perDay > 12) throw Error('Choose 1–12 classes per class day.');
  const start = localDate(settings.start);
  for (const date of settings.excluded ?? []) localDate(date);
  const needed = result.mustAttend;
  const days: RecoveryDay[] = [];
  if (needed === null || result.state === 'unreachable' || result.state === 'empty') return { days, needed, complete: false };
  let left = needed, attended = input.attended, total = input.total;
  for (let offset = 0; offset < 180 && left > 0n; offset++) {
    const date = new Date(start); date.setDate(start.getDate() + offset);
    if (!settings.weekdays.includes(date.getDay()) || settings.excluded?.includes(dateKey(date))) continue;
    const count = Number(left < BigInt(settings.perDay) ? left : BigInt(settings.perDay));
    attended += count; total += count; left -= BigInt(count);
    days.push({ date: dateKey(date), classes: count, attended, total, percentage: percentage(BigInt(attended), BigInt(total))! });
  }
  return { days, needed, complete: left === 0n };
}
