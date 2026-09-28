import { calculateAttendance } from '../../domain/attendance';
import { parseAttendance } from '../../domain/validation';
import { resultMessage } from '../calculator/Result';
import { useEffect, useRef, useState } from 'preact/hooks';
import { emptySession, type Session, MAX_HISTORY, MAX_BACKUP_BYTES, MAX_SUBJECTS, mergeBackup } from './model';
import type { useSavedAttendance } from './useSavedAttendance';
import './saved.css';

type Saved = ReturnType<typeof useSavedAttendance>;
export function SubjectPicker({ saved, onSwitch }: { saved: Saved; onSwitch: () => void }) {
  return <div class="subject-picker">
    <label for="saved-subject" class="sr-only">Choose subject</label>
    <select id="saved-subject" disabled={!saved.ready} value={saved.state.activeId ?? ''} onChange={event => { const id = event.currentTarget.value || null; saved.change(state => ({ ...state, activeId: id })); onSwitch(); }}>
      <option value="">Quick calculation</option>
      {saved.state.subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
    </select>
    <a href="#saved-tools">{saved.state.activeId ? 'Manage' : 'Save subject'} <span aria-hidden="true">↓</span></a>
  </div>;
}
function download(text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = `bunkmeter-backup-${new Date().toISOString().slice(0, 10)}.json`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function SavedControls({ saved, onSwitch }: { saved: Saved; onSwitch: () => void }) {
  const { state, change, status, ready } = saved;
  const [name, setName] = useState('');
  const [notice, setNotice] = useState('');
  const [removing, setRemoving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const active = state.subjects.find(s => s.id === state.activeId);
  const failure = status === 'conflict' || status === 'unavailable';
  useEffect(() => { setName(''); setRemoving(false); }, [state.activeId]);
  function saveSubject() {
    const title = name.trim();
    if (!title) { setNotice('Enter a subject name, such as Physics.'); return; }
    if (!active && state.subjects.length >= MAX_SUBJECTS) { setNotice('You can save up to 20 subjects.'); return; }
    change(value => active
      ? { ...value, subjects: value.subjects.map(s => s.id === active.id ? { ...s, name: title } : s) }
      : addSubject(value, title));
    setName(''); setNotice(active ? 'Subject renamed.' : 'Subject added. Check the save status above.'); onSwitch();
  }
  function addSubject(value: typeof state, title: string) {
    const id = crypto.randomUUID();
    return { ...value, activeId: id, quick: saved.temporary ? value.quick : emptySession(), subjects: [...value.subjects, { id, name: title, session: saved.session }] };
  }
  async function importFile(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > MAX_BACKUP_BYTES) throw Error('Choose a BunkMeter backup under 1 MB.');
      const text = await file.text();
      let restoredDraft: Session | undefined;
      change(value => { const next = mergeBackup(value, text, () => crypto.randomUUID()); restoredDraft = next.draftBackup; return next; });
      setNotice('Backup imported. Existing records were kept.'); onSwitch();
      if (restoredDraft) saved.startTemporary(restoredDraft);
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not import this backup.'); }
    finally { if (fileInput.current) fileInput.current.value = ''; }
  }
  return <section class="saved-tools" id="saved-tools" aria-label="Saved attendance and getting started">
    <p class={`save-status ${failure ? 'save-status--error' : ''}`} role="status" data-testid="save-status">
      {status === 'loading' ? 'Loading saved attendance…' : status === 'saving' ? 'Saving on this device…' : status === 'temporary' ? 'Separate calculation. Save as a subject to keep it.' : status === 'saved' ? 'Saved on this device.' : status === 'ready' ? 'Your numbers will save on this device.' : status === 'conflict' ? 'Not saved: another tab changed your attendance. Export this tab’s backup before reloading to load the saved version.' : 'Saving unavailable. Your previous saved data has not been overwritten. Export a backup of these numbers before leaving.'}
    </p>
    <p class="storage-explainer">No account needed. Use the same browser to return. Clearing site data or using private browsing can remove saved records. <a href="/privacy-policy">Storage & privacy</a></p>
    {state.subjects.length > 1 && <details class="saved-details"><summary>Your subjects at a glance<span aria-hidden="true">+</span></summary><ul class="subject-overview">{state.subjects.map(subject => { const parsed = parseAttendance(subject.session.fields); const result = parsed.valid ? calculateAttendance(parsed.value) : null; return <li key={subject.id}><button type="button" onClick={() => { change(value => ({ ...value, activeId: subject.id })); onSwitch(); }}><strong>{subject.name}</strong><span>{parsed.valid && result ? resultMessage(parsed.value, result) : 'Check the saved counts'}</span></button></li>; })}</ul></details>}
    <details class="saved-details">
      <summary>{active ? `Manage ${active.name}` : 'Save as a subject'}<span aria-hidden="true">+</span></summary>
      <div class="saved-content">
        <label for="subject-name">{active ? 'New subject name' : 'Subject name'}</label>
        <div class="subject-name-row"><input id="subject-name" type="text" maxLength={50} value={name} placeholder={active?.name ?? 'e.g. Physics'} onInput={event => setName(event.currentTarget.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); saveSubject(); } }} /><button type="button" disabled={!ready} onClick={saveSubject}>{active ? 'Rename' : 'Save subject'}</button></div>
        <p>Each subject keeps its own counts, target and last 50 dated class actions. Editing counts starts a new Undo history.</p>
        {active && <button class="subtle-button" type="button" onClick={() => setRemoving(true)}>Remove this subject</button>}
        {active && removing && <div class="remove-confirm"><p>Remove {active.name}? You can restore the last removed subject below.{state.removed && <> This replaces the recovery copy of {state.removed.name}; export a backup first if you need to keep it.</>}</p><button type="button" onClick={() => { change(value => ({ ...value, subjects: value.subjects.filter(s => s.id !== active.id), removed: active, activeId: null })); setRemoving(false); onSwitch(); setNotice('Subject removed. Restore is available below.'); }}>Confirm removal</button><button type="button" onClick={() => setRemoving(false)}>Keep subject</button></div>}
      </div>
    </details>
    {state.removed && <button class="subtle-button" type="button" disabled={state.subjects.length >= MAX_SUBJECTS} onClick={() => { change(value => value.removed ? { ...value, subjects: [...value.subjects, value.removed], activeId: value.removed.id, removed: null } : value); onSwitch(); }}>Restore {state.removed.name}</button>}
    <details class="saved-details">
      <summary>Backup & transfer<span aria-hidden="true">+</span></summary>
      <div class="saved-content"><p>Download a backup before clearing browser data or changing devices. An empty workspace restores the backup. Otherwise import adds subjects without replacing existing records. Backups contain your subject names and attendance, so keep them private.</p><div class="backup-actions"><button type="button" disabled={!ready} onClick={() => download(JSON.stringify(saved.backup, null, 2))}>Export backup</button><label class="import-label" for="backup-file">Import backup (adds subjects)</label><input ref={fileInput} id="backup-file" type="file" accept=".json,application/json" disabled={!ready} onChange={event => { void importFile(event.currentTarget.files?.[0]); }} /></div></div>
    </details>
    <details class="saved-details">
      <summary>New here? A 30-second guide<span aria-hidden="true">+</span></summary>
      <ol class="saved-content guide-steps"><li><strong>Start from your official counts.</strong> Enter classes held and attended. Set your course’s target.</li><li><strong>Save a subject.</strong> Name it Physics, Maths or anything you recognise. Repeat for subjects with separate attendance rules.</li><li><strong>Come back after class.</strong> Choose the subject, then tap Present or Absent once per counted class. Undo fixes a mistaken tap.</li><li><strong>Plan without changing your record.</strong> The what-if buttons preview a future run. They never log attendance.</li></ol>
    </details>
    <details class="saved-details"><summary>Recent class history ({saved.session.events.length})<span aria-hidden="true">+</span></summary><div class="saved-content"><p>Last {MAX_HISTORY} classes, with the time you logged each action. Undo restores counts. Editing counts starts a new history.</p>{saved.session.events.length ? <ol class="attendance-history">{saved.session.events.slice().reverse().map(event => <li key={event.id}><strong>{event.kind === 'present' ? 'Present' : 'Absent'}</strong><span>Class {Number(event.before.total) + 1}</span>{event.recordedAt ? <time dateTime={event.recordedAt}>{new Date(event.recordedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</time> : <span>Date not recorded</span>}</li>)}</ol> : <p>No classes logged yet.</p>}</div></details>
    <p class="saved-notice" role="status">{notice}</p>
  </section>;
}
