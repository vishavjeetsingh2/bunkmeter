import { useEffect, useRef, useState } from 'preact/hooks';
import { ConflictError, openDatabase, readWorkspace, writeWorkspace } from './database';
import { currentSession, emptyWorkspace, type Session, type Workspace } from './model';
import { readAttendancePreset } from '../calculator/sharing';
import type { AttendanceFields } from '../../domain/validation';
import { setSaveBarrier } from '../../platform';

export type SaveStatus = 'loading' | 'ready' | 'saving' | 'saved' | 'unavailable' | 'conflict' | 'temporary';
export function useSavedAttendance(initial: AttendanceFields, path: string) {
  const [state, setState] = useState<Workspace>(() => ({ ...emptyWorkspace(), quick: { fields: initial, events: [] } }));
  const [status, setStatus] = useState<SaveStatus>('loading');
  const [temporary, setTemporary] = useState<Session | null>(null);
  const current = useRef(state);
  const temporaryRef = useRef<Session | null>(null);
  const db = useRef<IDBDatabase | null>(null);
  const expectedRevision = useRef('');
  const stopped = useRef(true);
  const pending = useRef(0);
  const queue = useRef(Promise.resolve());
  function startTemporary(session: Session | null) { temporaryRef.current = session; setTemporary(session); }
  useEffect(() => {
    let disposed = false, finished = false;
    const preset = readAttendancePreset(window.location.search, initial);
    // Shared links and university defaults never replace a saved subject or quick draft.
    if (preset.fields || preset.invalid || path !== '/') startTemporary({ fields: preset.fields ?? initial, events: [] });
    const timeout = setTimeout(() => { if (!disposed && !finished) { finished = true; setStatus('unavailable'); db.current?.close(); } }, 5000);
    void openDatabase().then(async connection => {
      if (disposed || finished) { connection.close(); return; }
      db.current = connection;
      const saved = await readWorkspace(connection);
      if (disposed || finished) return;
      if (saved?.draftBackup && !preset.fields && !preset.invalid && path === '/') startTemporary(saved.draftBackup);
      if (saved) { current.current = saved; setState(saved); expectedRevision.current = saved.revision; }
      stopped.current = false; finished = true; clearTimeout(timeout);
      setStatus(saved ? 'saved' : 'ready');
    }).catch(() => { if (!disposed && !finished) { finished = true; clearTimeout(timeout); setStatus('unavailable'); } });
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (pending.current || (stopped.current && current.current.revision !== expectedRevision.current)) { event.preventDefault(); }
    };
    window.addEventListener('beforeunload', beforeUnload);
    setSaveBarrier(async () => {
      while (pending.current) await queue.current;
      return current.current.revision === expectedRevision.current;
    });
    return () => { disposed = true; clearTimeout(timeout); db.current?.close(); setSaveBarrier(undefined); window.removeEventListener('beforeunload', beforeUnload); };
  }, []);

  function change(update: (value: Workspace) => Workspace) {
    if (status === 'loading') return;
    const base = { ...current.current }; delete base.draftBackup;
    const next = { ...update(base), revision: crypto.randomUUID() };
    current.current = next; setState(next);
    if (stopped.current || !db.current) return;
    setStatus('saving'); pending.current++;
    queue.current = queue.current.then(async () => {
      try {
        if (stopped.current || !db.current) return;
        await writeWorkspace(db.current, next, expectedRevision.current);
        expectedRevision.current = next.revision;
        if (current.current.revision === next.revision) setStatus('saved');
      } catch (error) {
        stopped.current = true;
        setStatus(error instanceof ConflictError ? 'conflict' : 'unavailable');
      } finally { pending.current--; }
    });
  }
  function setSession(update: Session | ((session: Session) => Session)) {
    if (status === 'loading') return;
    if (temporaryRef.current) {
      startTemporary(typeof update === 'function' ? update(temporaryRef.current) : update); return;
    }
    change(value => {
      const session = typeof update === 'function' ? update(currentSession(value)) : update;
      return value.activeId === null ? { ...value, quick: session } : { ...value, subjects: value.subjects.map(s => s.id === value.activeId ? { ...s, session } : s) };
    });
  }
  return { state: temporary ? { ...state, activeId: null } : state, change, session: temporary ?? currentSession(state), setSession, startTemporary, temporary: Boolean(temporary), status: temporary && status !== 'loading' && status !== 'unavailable' && status !== 'conflict' ? 'temporary' as const : status, ready: status !== 'loading', backup: temporary ? { ...state, draftBackup: temporary } : state };
}
