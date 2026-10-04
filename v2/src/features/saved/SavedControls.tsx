import { useEffect, useRef, useState } from 'preact/hooks';
import { emptySession, type Session, MAX_HISTORY, MAX_BACKUP_BYTES, MAX_SUBJECTS, mergeBackup } from './model';
import type { useSavedAttendance } from './useSavedAttendance';
import './saved.css';
import { nativeServices } from '../../platform';
import Icon from '../../components/Icon';

type Saved = ReturnType<typeof useSavedAttendance>;
export function openSubjectEditor() {
  const details = document.getElementById('subject-editor') as HTMLDetailsElement | null;
  if (details) details.open = true;
  document.getElementById('subject-name')?.focus();
}
export function SubjectPicker({ saved, onSwitch }: { saved: Saved; onSwitch: () => void }) {
  const failure = saved.status === 'conflict' || saved.status === 'unavailable';
  const label = failure ? 'Not saved · see backup options' : saved.status === 'loading' ? 'Loading your records…' : saved.status === 'saving' ? 'Saving…' : saved.status === 'temporary' ? 'Separate calculation · not saved' : saved.status === 'saved' ? 'Saved on this device' : 'Auto-saves on this device';
  return <><div class="subject-picker">
    <span class="subject-emblem"><Icon name="subjects" size={22}/></span><label for="saved-subject" class="sr-only">Choose subject</label>
    <select id="saved-subject" disabled={!saved.ready} value={saved.state.activeId ?? ''} onChange={event => { const id = event.currentTarget.value || null; saved.change(state => ({ ...state, activeId: id })); onSwitch(); }}>
      <option value="">Quick calculation</option>
      {saved.state.subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
    </select>
    <a href="#subject-editor" onClick={event => { event.preventDefault(); openSubjectEditor(); }}>{saved.state.activeId ? 'Manage' : 'Save subject'} <span aria-hidden="true">↓</span></a>
  </div><a class={`inline-save-status ${failure ? 'inline-save-status--error' : ''}`} href="#saved-tools"><span aria-hidden="true">{failure ? '!' : saved.status === 'saved' ? '✓' : '·'}</span>{label}</a></>;
}
async function download(text: string) {
  const filename = `bunkmeter-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const native = nativeServices();
  if (native) { await native.exportBackup(text, filename); return; }
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
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
  async function exportBackup() {
    try { await download(JSON.stringify(saved.backup, null, 2)); setNotice('Backup export opened. Keep the file somewhere safe.'); }
    catch { setNotice('Backup export did not complete. Please try again.'); }
  }
  useEffect(() => { setName(''); setRemoving(false); }, [state.activeId]);
  function saveSubject() {
    const title = name.trim();
    if (!title) { setNotice('Enter a subject name, such as Physics.'); return; }
    if (!active && state.subjects.length >= MAX_SUBJECTS) { setNotice('You can save up to 20 subjects.'); return; }
    change(value => active
      ? { ...value, subjects: value.subjects.map(s => s.id === active.id ? { ...s, name: title } : s) }
      : addSubject(value, title));
    setName(''); setNotice(active ? 'Subject renamed.' : 'Subject added. Check the save status above.'); onSwitch();
    if (!active) requestAnimationFrame(() => document.getElementById('saved-subject')?.focus());
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
    <div class="saved-heading"><h2>History & backup</h2><span class="storage-chip"><Icon name="storage" size={16}/> On this device</span></div>
    <p class={`save-status ${failure ? 'save-status--error' : ''}`} role="status" data-testid="save-status">
      {status === 'loading' ? 'Loading saved attendance…' : status === 'saving' ? 'Saving on this device…' : status === 'temporary' ? 'Separate calculation. Save as a subject to keep it.' : status === 'saved' ? 'Saved on this device.' : status === 'ready' ? 'Your numbers will save on this device.' : status === 'conflict' ? 'Not saved: another tab changed your attendance. Export this tab’s backup before reloading to load the saved version.' : 'Saving unavailable. Your previous saved data has not been overwritten. Export a backup of these numbers before leaving.'}
    </p>
    <p class="storage-explainer">No account needed. Return on this device. Clearing browser or app data can remove saved records. <a href="https://bunkmeter.online/privacy-policy">Storage & privacy</a></p>
    <details class="saved-details" id="subject-editor">
      <summary>{active ? `Manage ${active.name}` : 'Save as a subject'}<span aria-hidden="true">+</span></summary>
      <div class="saved-content">
        <label for="subject-name">{active ? 'New subject name' : 'Subject name'}</label>
        <div class="subject-name-row"><input id="subject-name" type="text" maxLength={50} value={name} placeholder={active?.name ?? 'e.g. Physics'} onInput={event => setName(event.currentTarget.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); saveSubject(); } }} /><button type="button" disabled={!ready} onClick={saveSubject}>{active ? 'Rename' : 'Save subject'}</button></div>
        <p>Each subject keeps its own counts, target and last 50 dated class actions. Editing counts starts a new Undo history.</p>
        <a class="return-to-calculator" href="#calculator" onClick={event => { event.preventDefault(); document.getElementById('saved-subject')?.focus(); }}>Back to calculator <span aria-hidden="true">↑</span></a>
        {active && <button class="subtle-button" type="button" onClick={() => setRemoving(true)}>Remove this subject</button>}
        {active && removing && <div class="remove-confirm"><p>Remove {active.name}? You can restore the last removed subject below.{state.removed && <> This replaces the recovery copy of {state.removed.name}; export a backup first if you need to keep it.</>}</p><button type="button" onClick={() => { change(value => ({ ...value, subjects: value.subjects.filter(s => s.id !== active.id), removed: active, activeId: null })); setRemoving(false); onSwitch(); setNotice('Subject removed. Restore is available below.'); }}>Confirm removal</button><button type="button" onClick={() => setRemoving(false)}>Keep subject</button></div>}
      </div>
    </details>
    {state.removed && <button class="subtle-button" type="button" disabled={state.subjects.length >= MAX_SUBJECTS} onClick={() => { change(value => value.removed ? { ...value, subjects: [...value.subjects, value.removed], activeId: value.removed.id, removed: null } : value); onSwitch(); }}>Restore {state.removed.name}</button>}
    <div class="saved-utility-grid"><section class="activity-card" aria-labelledby="activity-title"><h3 id="activity-title"><Icon name="history"/>Recent activity</h3><div class="activity-tiles">{saved.session.events.length ? saved.session.events.slice(-12).map(event => <span key={event.id} data-kind={event.kind} role="img" aria-label={`${event.kind}, class ${Number(event.before.total) + 1}`}><Icon name={event.kind === 'present' ? 'check' : 'close'}/><small>{Number(event.before.total) + 1}</small></span>) : <><div class="activity-placeholder" aria-hidden="true"><Icon name="check"/><Icon name="check"/><Icon name="close"/><Icon name="check"/></div><p>Classes you mark appear here.</p></>}</div><a href="#class-history" onClick={event => { event.preventDefault(); const history = document.getElementById('class-history') as HTMLDetailsElement | null; if (history) { history.open = true; history.querySelector('summary')?.focus(); } }}>View dated history <Icon name="arrow" size={15}/></a></section>
    <section class="backup-card" aria-labelledby="backup-title"><h3 id="backup-title"><Icon name="storage"/>Keep a copy</h3><p>Take your subjects to another browser or the app.</p><div class="backup-actions"><button type="button" disabled={!ready} onClick={() => { void exportBackup(); }}><Icon name="download"/>Export backup</button><button type="button" disabled={!ready} onClick={() => fileInput.current?.click()}><Icon name="upload"/>Restore backup</button><label class="sr-only" for="backup-file">Import backup (adds subjects)</label><input hidden ref={fileInput} id="backup-file" type="file" accept=".json,application/json" disabled={!ready} onChange={event => { void importFile(event.currentTarget.files?.[0]); }} /></div><details class="saved-details"><summary>Backup & transfer<span aria-hidden="true">+</span></summary><div class="saved-content"><p>Export a backup before clearing data or changing devices. An empty workspace restores the backup. Otherwise import adds subjects without replacing existing records. Backups contain your subject names and attendance, so keep them private.</p></div></details></section></div>
    <details class="saved-details">
      <summary>New here? A 30-second guide<span aria-hidden="true">+</span></summary>
      <ol class="saved-content guide-steps"><li><strong>Start from your official counts.</strong> Enter classes held and attended. Set your course’s target.</li><li><strong>Save a subject.</strong> Name it Physics, Maths or anything you recognise. Repeat for subjects with separate attendance rules.</li><li><strong>Come back after class.</strong> Choose the subject, then tap Present or Absent once per counted class. Undo fixes a mistaken tap.</li><li><strong>Plan without changing your record.</strong> The what-if buttons preview a future run. They never log attendance.</li></ol>
    </details>
    <details class="saved-details" id="class-history"><summary>Recent class history ({saved.session.events.length})<span aria-hidden="true">+</span></summary><div class="saved-content"><p>Last {MAX_HISTORY} classes, with the time you logged each action. Undo restores counts. Editing counts starts a new history.</p>{saved.session.events.length ? <ol class="attendance-history">{saved.session.events.slice().reverse().map(event => <li key={event.id} data-kind={event.kind}><Icon name={event.kind === 'present' ? 'check' : 'close'}/><strong>{event.kind === 'present' ? 'Present' : 'Absent'}</strong><span>Class {Number(event.before.total) + 1}</span>{event.recordedAt ? <time dateTime={event.recordedAt}>{new Date(event.recordedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</time> : <span>Date not recorded</span>}</li>)}</ol> : <p>No classes logged yet.</p>}</div></details>
    <p class="saved-notice" role="status">{notice}</p>
  </section>;
}
