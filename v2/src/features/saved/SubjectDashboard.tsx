import { calculateAttendance, targetLabel, targetPercent } from '../../domain/attendance';
import { parseAttendance } from '../../domain/validation';
import { resultMessage, resultTone } from '../calculator/Result';
import type { useSavedAttendance } from './useSavedAttendance';
import { MAX_SUBJECTS } from './model';

export default function SubjectDashboard({ saved, onOpen, onAdd, appMode = false }: {
  saved: ReturnType<typeof useSavedAttendance>; onOpen: (id: string) => void; onAdd: () => void; appMode?: boolean;
}) {
  const subjects = saved.state.subjects;
  if (!subjects.length && !appMode) return null;
  return <section class="subject-dashboard" id="subjects" aria-labelledby="subjects-title">
    <header class="subjects-heading"><div><span class="eyebrow">Your semester, a class at a time</span><h2 id="subjects-title" tabIndex={-1}>Your subjects <small>{subjects.length || ''}</small></h2></div><button class="add-subject" type="button" disabled={!saved.ready || subjects.length >= MAX_SUBJECTS} onClick={onAdd}><span aria-hidden="true">＋</span> Add subject</button></header>
    {!subjects.length ? <div class="subjects-empty"><span class="empty-subject-icon" aria-hidden="true">＋</span><h3>Start with one subject.</h3><p>Enter its counts, save its name, then log each class with a tap.</p><button class="add-subject" type="button" disabled={!saved.ready} onClick={onAdd}>Add your first subject</button></div> : <ul class="subject-cards">{subjects.map(subject => {
      const parsed = parseAttendance(subject.session.fields);
      const result = parsed.valid ? calculateAttendance(parsed.value) : null;
      const tone = parsed.valid && result ? resultTone(parsed.value, result) : 'neutral';
      const status = !result || result.state === 'empty' ? 'Set up counts' : tone === 'danger' ? 'Out of reach' : tone === 'caution' ? result.state === 'recovery' ? 'Recovery needed' : 'No skip buffer' : tone === 'safe' ? 'On track' : 'No minimum';
      return <li key={subject.id}><button class="subject-card" data-tone={tone} type="button" disabled={!saved.ready} onClick={() => onOpen(subject.id)} aria-label={`Open ${subject.name}`}>
        <span class="subject-card-top"><strong>{subject.name}</strong><span class="subject-state">{status}</span></span>
        <span class="subject-card-number">{result?.percentage ?? '—'}{result?.percentage !== null && result && <small>%</small>}<span>Target {parsed.valid ? targetLabel(parsed.value) : subject.session.fields.target}%</span></span>
        <span class="subject-meter" aria-hidden="true"><span style={{ width: `${result?.percentage ?? 0}%` }} />{parsed.valid && <i style={{ left: `${Math.min(99, targetPercent(parsed.value))}%` }} />}</span>
        <span class="subject-counts">{subject.session.fields.attended || '—'} attended / {subject.session.fields.total || '—'} held</span>
        <span class="subject-next">{parsed.valid && result ? resultMessage(parsed.value, result) : 'Enter your official class counts.'}</span>
        <span class="subject-card-action">Open & log a class <span aria-hidden="true">↗</span></span>
      </button></li>;
    })}</ul>}
    {subjects.length > 0 && <p class="subjects-local">Stored on this device · Each subject has its own target.</p>}
  </section>;
}
