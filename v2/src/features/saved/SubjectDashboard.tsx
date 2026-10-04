import { calculateAttendance, targetLabel, targetPercent, MAX_CLASSES } from '../../domain/attendance';
import { useState } from 'preact/hooks';
import Icon from '../../components/Icon';
import { parseAttendance } from '../../domain/validation';
import { resultMessage, resultTone } from '../calculator/Result';
import type { useSavedAttendance } from './useSavedAttendance';
import { MAX_SUBJECTS } from './model';
import { attendanceStatus } from '../calculator/presentation';

export default function SubjectDashboard({ saved, onOpen, onAdd, onRecord, onUndo }: {
  saved: ReturnType<typeof useSavedAttendance>; onOpen: (id: string) => void; onAdd: () => void;
  onRecord: (id: string, kind: 'present' | 'absent') => void; onUndo: (id: string) => void;
}) {
  const subjects = saved.state.subjects;
  const [feedback, setFeedback] = useState<{ id: string; text: string } | null>(null);
  return <section class={`subject-dashboard ${subjects.length ? '' : 'subject-dashboard--empty'}`} id="subjects" aria-labelledby="subjects-title">
    <header class="subjects-heading"><div><span class="eyebrow">Your semester, a class at a time</span><h2 id="subjects-title" tabIndex={-1}>Your subjects <small>{subjects.length || ''}</small></h2></div><button class="add-subject" type="button" disabled={!saved.ready || subjects.length >= MAX_SUBJECTS} onClick={onAdd}><span aria-hidden="true">＋</span> Add subject</button></header>
    {!subjects.length ? <div class="subjects-empty"><span class="empty-subject-icon"><Icon name="subjects" size={23}/></span><div><h3>One subject. Every class.</h3><p>Enter counts → save a subject → tap after class.</p></div><button class="add-subject" type="button" disabled={!saved.ready} onClick={onAdd}>Add your first subject <Icon name="arrow" size={17}/></button></div> : <ul class="subject-cards">{subjects.map(subject => {
      const parsed = parseAttendance(subject.session.fields);
      const result = parsed.valid ? calculateAttendance(parsed.value) : null;
      const tone = parsed.valid && result ? resultTone(parsed.value, result) : 'neutral';
      const status = parsed.valid && result ? attendanceStatus(parsed.value, result) : { label: 'Set up counts', icon: 'minus' as const };
      const recordable = saved.ready && parsed.valid && parsed.value.total < MAX_CLASSES && parsed.value.remaining !== 0;
      return <li key={subject.id}><article class="subject-card" data-tone={tone} data-active={!saved.temporary && saved.state.activeId === subject.id}><button class="subject-open" type="button" disabled={!saved.ready} onClick={() => onOpen(subject.id)} aria-label={`Open ${subject.name}`}>
        <span class="subject-card-top"><strong>{subject.name}</strong><span class="subject-state"><Icon name={status.icon} size={12}/>{status.label}</span></span>
        <span class="subject-card-number">{result?.percentage ?? '—'}{result?.percentage !== null && result && <small>%</small>}<span>Target {parsed.valid ? targetLabel(parsed.value) : subject.session.fields.target}%</span></span>
        <span class="subject-meter" aria-hidden="true"><span style={{ width: `${result?.percentage ?? 0}%` }} />{parsed.valid && <i style={{ left: `${Math.min(99, targetPercent(parsed.value))}%` }} />}</span>
        <span class="subject-counts">{subject.session.fields.attended || '—'} attended / {subject.session.fields.total || '—'} held</span>
        <span class="subject-next">{parsed.valid && result ? resultMessage(parsed.value, result) : 'Enter your official class counts.'}</span>
        <span class="subject-card-action">Open calculator <Icon name="arrow" size={16}/></span>
      </button><div class="subject-quick-actions">{(['present', 'absent'] as const).map(kind => <button class={`subject-log subject-log--${kind}`} type="button" key={kind} disabled={!recordable} aria-label={`Mark ${subject.name} ${kind}`} onClick={() => { onRecord(subject.id, kind); setFeedback({ id: subject.id, text: `${kind === 'present' ? '✓ Present' : '× Absent'} · ${result?.percentage ?? '—'}% → ${kind === 'present' ? result?.nextPresent : result?.nextAbsent}%` }); }}><Icon name={kind === 'present' ? 'check' : 'close'} size={17}/>{kind === 'present' ? 'Present' : 'Absent'}</button>)}</div><div class="subject-action-status"><span role="status">{feedback?.id === subject.id ? feedback.text : 'Tap after each class'}</span><button type="button" aria-label={`${subject.name}: Undo last class`} disabled={!saved.ready || !subject.session.events.length} onClick={() => { onUndo(subject.id); setFeedback({ id: subject.id, text: 'Last class undone.' }); }}>Undo</button></div></article></li>;
    })}</ul>}
    {subjects.length > 0 && <p class="subjects-local">{saved.status === 'saved' ? '✓ Saved on this device' : saved.status === 'saving' ? 'Saving…' : saved.status === 'unavailable' || saved.status === 'conflict' ? 'Changes not saved — use backup below' : 'Local attendance'} · Each subject has its own target.</p>}
  </section>;
}
