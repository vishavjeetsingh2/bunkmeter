import type { AttendanceFields } from '../../domain/validation';
import { applyClass, type ClassKind } from '../calculator/class-actions';

export const MAX_SUBJECTS = 20;
export const MAX_BACKUP_BYTES = 1_000_000;
export const MAX_HISTORY = 50;
export const initialFields: AttendanceFields = { attended: '', total: '', target: '75', remaining: '' };
export type ClassEvent = { id: number; kind: ClassKind; before: AttendanceFields; recordedAt?: string };
export type Session = { fields: AttendanceFields; events: ClassEvent[] };
export type Subject = { id: string; name: string; session: Session };
export type Workspace = { version: 1; revision: string; activeId: string | null; quick: Session; subjects: Subject[]; removed: Subject | null; draftBackup?: Session };
export const emptySession = (): Session => ({ fields: { ...initialFields }, events: [] });
export const emptyWorkspace = (): Workspace => ({ version: 1, revision: '', activeId: null, quick: emptySession(), subjects: [], removed: null });
export const currentSession = (state: Workspace): Session => state.subjects.find(subject => subject.id === state.activeId)?.session ?? state.quick;
export function appendClass(session: Session, kind: 'present' | 'absent', recordedAt: string): Session | null {
  const next = applyClass(session.fields, kind);
  return next ? { fields: next, events: [...session.events.slice(-(MAX_HISTORY - 1)), { id: (session.events.at(-1)?.id ?? 0) + 1, kind, before: session.fields, recordedAt }] } : null;
}
const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const shortText = (value: unknown, limit: number): value is string => typeof value === 'string' && value.length <= limit;

function fields(value: unknown): AttendanceFields {
  if (!object(value) || !shortText(value.attended, 32) || !shortText(value.total, 32) || !shortText(value.target, 16) || !shortText(value.remaining, 32)) throw Error('Invalid attendance fields.');
  // Drafts may be incomplete/invalid. Keep the exact text; the calculator validates it.
  return { attended: value.attended, total: value.total, target: value.target, remaining: value.remaining };
}
function session(value: unknown): Session {
  if (!object(value) || !Array.isArray(value.events) || value.events.length > MAX_HISTORY) throw Error('Invalid recent class records.');
  const result: Session = { fields: fields(value.fields), events: value.events.map(event => {
    if (!object(event) || !Number.isSafeInteger(event.id) || Number(event.id) < 1 || (event.kind !== 'present' && event.kind !== 'absent')) throw Error('Invalid class action.');
    if (event.recordedAt !== undefined && (typeof event.recordedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(event.recordedAt) || event.recordedAt.length > 30 || !Number.isFinite(Date.parse(event.recordedAt)))) throw Error('Invalid class date.');
    return { id: Number(event.id), kind: event.kind, before: fields(event.before), ...(typeof event.recordedAt === 'string' ? { recordedAt: event.recordedAt } : {}) };
  }) };
  const ids = new Set<number>();
  for (let i = 0; i < result.events.length; i++) {
    const event = result.events[i]!;
    const expected = applyClass(event.before, event.kind);
    const actual = result.events[i + 1]?.before ?? result.fields;
    if (ids.has(event.id) || !expected || Object.keys(expected).some(key => expected[key as keyof AttendanceFields] !== actual[key as keyof AttendanceFields])) throw Error('Class history does not match the saved counts.');
    ids.add(event.id);
  }
  return result;
}
function subject(value: unknown): Subject {
  if (!object(value) || !shortText(value.id, 80) || !value.id || !shortText(value.name, 50) || !value.name.trim()) throw Error('Invalid subject.');
  return { id: value.id, name: value.name.trim(), session: session(value.session) };
}
export function decodeWorkspace(value: unknown): Workspace {
  if (!object(value) || value.version !== 1) throw Error('This backup version is not supported. Your saved data has not been changed.');
  if (!shortText(value.revision, 80) || !Array.isArray(value.subjects) || value.subjects.length > MAX_SUBJECTS) throw Error('Invalid saved workspace.');
  const subjects = value.subjects.map(subject);
  if (new Set(subjects.map(s => s.id)).size !== subjects.length || (value.activeId !== null && !subjects.some(s => s.id === value.activeId))) throw Error('Invalid subject selection.');
  const removed = value.removed === null ? null : subject(value.removed);
  if (removed && subjects.some(s => s.id === removed.id)) throw Error('Invalid removed subject.');
  return { version: 1, revision: value.revision, activeId: value.activeId as string | null, quick: session(value.quick), subjects, removed, ...(value.draftBackup === undefined ? {} : { draftBackup: session(value.draftBackup) }) };
}
export function mergeBackup(current: Workspace, text: string, newId: () => string): Workspace {
  if (new TextEncoder().encode(text).length > MAX_BACKUP_BYTES) throw Error('Backup is too large. Choose a BunkMeter backup under 1 MB.');
  const incoming = decodeWorkspace(JSON.parse(text));
  // A fresh browser must restore a full-capacity backup, including its quick draft
  // and recovery copy, without converting those auxiliary records into subjects.
  const pristine = !current.subjects.length && !current.removed && !current.draftBackup
    && !current.quick.fields.total && !current.quick.fields.attended && !current.quick.fields.remaining
    && current.quick.fields.target === initialFields.target;
  if (pristine && (incoming.subjects.length || incoming.removed || incoming.draftBackup || incoming.quick.fields.total || incoming.quick.fields.attended)) {
    return { ...incoming, revision: current.revision };
  }
  const subjects = [...incoming.subjects];
  if (incoming.draftBackup) subjects.push({ id: '', name: 'Imported separate calculation', session: incoming.draftBackup });
  if (incoming.quick.fields.total || incoming.quick.fields.attended) subjects.push({ id: '', name: 'Imported quick calculation', session: incoming.quick });
  if (incoming.removed) subjects.push({ ...incoming.removed, name: `${incoming.removed.name.slice(0, 39)} (restored)` });
  if (!subjects.length) throw Error('This backup has no attendance records to import.');
  if (current.subjects.length + subjects.length > MAX_SUBJECTS) throw Error('Import would exceed 20 subjects. Your existing records have not been changed.');
  const additions = subjects.map(s => ({ ...s, id: newId() }));
  return { ...current, subjects: [...current.subjects, ...additions], activeId: additions[0]!.id };
}
