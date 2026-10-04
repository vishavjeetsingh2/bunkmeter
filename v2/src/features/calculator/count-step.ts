import { MAX_CLASSES } from '../../domain/attendance';
import type { AttendanceFields } from '../../domain/validation';

export function steppedCount(fields: AttendanceFields, name: 'total' | 'attended' | 'remaining', direction: -1 | 1): string | null {
  const raw = fields[name].trim();
  if (raw && !/^\d+$/.test(raw)) return null;
  const next = Number(raw || '0') + direction;
  if (!Number.isSafeInteger(next) || next < 0 || next > MAX_CLASSES) return null;
  if (name === 'attended' && (!/^\d+$/.test(fields.total.trim()) || next > Number(fields.total))) return null;
  if (name === 'total' && /^\d+$/.test(fields.attended.trim()) && next < Number(fields.attended)) return null;
  return String(next);
}
