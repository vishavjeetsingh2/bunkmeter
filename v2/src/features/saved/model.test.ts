import { describe, expect, it } from 'vitest';
import { applyClass } from '../calculator/class-actions';
import { currentSession, decodeWorkspace, emptyWorkspace, mergeBackup, type Workspace } from './model';

const fixture = (): Workspace => {
  const state = emptyWorkspace();
  const before = { attended: '90', total: '110', target: '75', remaining: '20' };
  state.quick = { fields: applyClass(before, 'absent')!, events: [{ id: 1, kind: 'absent', before }] };
  return state;
};
describe('saved attendance validation and non-destructive imports', () => {
  it('round trips exact counts, target, remaining and reversible actions', () => {
    const original = fixture();
    expect(decodeWorkspace(JSON.parse(JSON.stringify(original)))).toEqual(original);
    expect(currentSession(original).events[0]!.before.remaining).toBe('20');
  });
  it('preserves incomplete and invalid drafts without pretending they are valid', () => {
    const state = emptyWorkspace(); state.quick.fields.attended = '2.5'; state.quick.fields.target = '';
    expect(decodeWorkspace(state).quick.fields).toEqual(state.quick.fields);
  });
  it.each([null, {}, { version: 2 }, { ...emptyWorkspace(), subjects: 'no' }, { ...emptyWorkspace(), activeId: 'missing' }])('rejects malformed or future-version records', value => {
    expect(() => decodeWorkspace(value)).toThrow();
  });
  it('rejects history that would Undo to unrelated counts', () => {
    const state = fixture(); state.quick.events[0]!.before.attended = '1';
    expect(() => decodeWorkspace(state)).toThrow('history');
  });
  it('rejects nonfinite actions, duplicate IDs, oversized fields and oversized subject lists', () => {
    const state = fixture(); state.quick.events[0]!.id = Infinity;
    expect(() => decodeWorkspace(state)).toThrow();
    const long = emptyWorkspace(); long.quick.fields.total = '1'.repeat(33);
    expect(() => decodeWorkspace(long)).toThrow();
    const duplicate = emptyWorkspace(); duplicate.subjects = [1, 2].map(() => ({ id: 'same', name: 'Physics', session: emptyWorkspace().quick }));
    expect(() => decodeWorkspace(duplicate)).toThrow();
    duplicate.subjects = Array.from({ length: 21 }, (_, i) => ({ id: String(i), name: 'Maths', session: emptyWorkspace().quick }));
    expect(() => decodeWorkspace(duplicate)).toThrow();
  });
  it('adds imports with new IDs without replacing any existing subject', () => {
    const state = fixture(); state.subjects = [{ id: 'original', name: 'Maths', session: state.quick }]; state.activeId = 'original';
    const before = JSON.stringify(state);
    let id = 0;
    const merged = mergeBackup(state, JSON.stringify(state), () => `new-${++id}`);
    expect(JSON.stringify(state)).toBe(before);
    expect(merged.subjects).toHaveLength(3);
    expect(merged.subjects[0]).toEqual(state.subjects[0]);
    expect(merged.activeId).toBe('new-1');
    expect(decodeWorkspace(merged)).toEqual(merged);
  });
  it('rejects oversize, empty or malformed imports without changing current data', () => {
    const original = fixture(); const snapshot = JSON.stringify(original);
    for (const text of ['x'.repeat(1_000_001), '{', JSON.stringify(emptyWorkspace())]) expect(() => mergeBackup(original, text, () => 'id')).toThrow();
    expect(JSON.stringify(original)).toBe(snapshot);
  });
});

it('preserves dated history, rejects malformed dates and exports a separate draft without losing the quick record', () => {
  const original = fixture(); original.quick.events[0]!.recordedAt = '2026-09-28T10:00:00.000Z';
  expect(decodeWorkspace(original)).toEqual(original);
  const backup = { ...original, draftBackup: { fields: { attended: '2', total: '3', target: '2/3', remaining: '' }, events: [] } };
  let id = 0;
  const imported = mergeBackup(emptyWorkspace(), JSON.stringify(backup), () => String(++id));
  expect(imported.quick).toEqual(backup.quick);
  expect(imported.draftBackup).toEqual(backup.draftBackup);
  original.quick.events[0]!.recordedAt = 'not a date';
  expect(() => decodeWorkspace(original)).toThrow('date');
});

it('restores a full-capacity backup into a fresh browser without losing auxiliary records', () => {
  const original = fixture();
  original.subjects = Array.from({ length: 20 }, (_, i) => ({ id: String(i), name: `Subject ${i}`, session: original.quick }));
  original.activeId = '19'; original.removed = { id: 'removed', name: 'Removed course', session: original.quick };
  original.draftBackup = original.quick;
  const restored = mergeBackup(emptyWorkspace(), JSON.stringify(original), () => 'unused');
  expect(restored).toEqual(original);
  expect(() => mergeBackup(fixture(), JSON.stringify(original), () => 'new')).toThrow('exceed');
});
