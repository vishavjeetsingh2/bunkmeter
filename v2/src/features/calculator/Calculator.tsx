import { useEffect, useRef, useState } from 'preact/hooks';
import { calculateAttendance, targetLabel, targetPercent, MAX_CLASSES } from '../../domain/attendance';
import { parseAttendance, type AttendanceFields, type FieldName } from '../../domain/validation';
import Result, { resultMessage, resultTone } from './Result';
import Instrument from '../instrument/Instrument';
import type { InstrumentState } from '../instrument/motion';
import { applyClass, projectClasses, type ClassKind } from './class-actions';
import { useChoreography } from './choreography';
import { readAttendancePreset } from './sharing';
import { useSavedAttendance } from '../saved/useSavedAttendance';
import { appendClass, type ClassEvent } from '../saved/model';
import LegacyBackup from '../saved/LegacyBackup';
import SavedControls, { SubjectPicker, openSubjectEditor } from '../saved/SavedControls';
import SubjectDashboard from '../saved/SubjectDashboard';
import Icon from '../../components/Icon';
import { steppedCount } from './count-step';
import { attendanceStatus } from './presentation';
import NumberReadout from './NumberReadout';
import './calculator.css';
import '../../styles/product.css';

const emptyFields: AttendanceFields = { attended: '', total: '', target: '75', remaining: '' };

export default function Calculator({ defaultTarget = '75', presets = ['75', '80', '85'], targetHelp = 'Use your course’s requirement. Rules vary by institution.', sharePath = '/', appMode = false }: { defaultTarget?: string; presets?: string[]; targetHelp?: string; sharePath?: string; appMode?: boolean } = {}) {
  const initial = { ...emptyFields, target: defaultTarget };
  const saved = useSavedAttendance(initial, sharePath, appMode);
  const { session, setSession } = saved;
  const [presetNotice, setPresetNotice] = useState('');
  const fields = session.fields;

  const workspace = useRef<HTMLDivElement>(null);
  const [direction, setDirection] = useState('edit');
  const [feedback, setFeedback] = useState('Tap after each counted class.');
  const [changeReadout, setChangeReadout] = useState<{ before: string; after: string; kind: ClassKind } | null>(null);
  const [undoGhost, setUndoGhost] = useState<ClassEvent | null>(null);
  const [previewCount, setPreviewCount] = useState(1);
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [announcement, setAnnouncement] = useState('');
  const [preview, setPreview] = useState<InstrumentState['preview']>(null);
  const totalRef = useRef<HTMLInputElement>(null);
  const parsed = parseAttendance(fields);
  const result = parsed.valid ? calculateAttendance(parsed.value) : null;
  const status = parsed.valid && result ? attendanceStatus(parsed.value, result) : null;
  const nextRun = parsed.valid && parsed.value.remaining !== 0 && parsed.value.targetBasisPoints > 0 && result && ['above', 'at-target', 'recovery'].includes(result.state)
    ? result.state === 'recovery' ? result.mustAttend : result.canMiss : null;
  const hasInvalid = !parsed.valid && Object.values(parsed.issues).some(issue => issue.kind === 'invalid');
  const message = parsed.valid && result ? resultMessage(parsed.value, result) : hasInvalid ? 'Check the highlighted fields. No result calculated.' : 'Enter classes held and attended to see your result.';
  const canRecord = saved.ready && parsed.valid && parsed.value.total < MAX_CLASSES && parsed.value.remaining !== 0;
  const canPreview = canRecord && result && result.percentage !== null;
  const activePreview = canPreview ? preview : null;
  const maxPreview = parsed.valid ? Math.min(12, MAX_CLASSES - parsed.value.total, parsed.value.remaining ?? 12) : 0;
  const runLength = Math.max(1, Math.min(previewCount, maxPreview));
  const futureInput = parsed.valid && activePreview ? projectClasses(parsed.value, activePreview, runLength) : null;
  const futureResult = futureInput ? calculateAttendance(futureInput) : null;
  const visualInput = futureInput ?? (parsed.valid ? parsed.value : null);
  const visualResult = futureResult ?? result;
  const visualValue = visualResult?.percentage ?? null;
  const instrumentState: InstrumentState = {
    value: visualValue,
    ratio: visualInput && visualInput.total > 0 ? visualInput.attended / visualInput.total : 0,
    target: parsed.valid ? targetPercent(parsed.value) : !parsed.issues.target ? fields.target === '2/3' ? 200 / 3 : Number(fields.target) : null,
    targetLabel: fields.target === '2/3' ? '66⅔' : fields.target,
    tone: visualInput && visualResult ? resultTone(visualInput, visualResult) : 'neutral',
    preview: activePreview,
    previewCount: runLength,
  };
  useChoreography(workspace, `${saved.state.activeId}|${fields.attended}|${fields.total}|${fields.target}|${fields.remaining}|${activePreview}|${runLength}|${session.events.length}`, direction);

  useEffect(() => {
    const preset = readAttendancePreset(window.location.search, initial);
    if (preset.fields) {
      setPresetNotice('Values loaded from the link. Check them against your attendance record.');
    } else if (preset.invalid) setPresetNotice('This link contains invalid attendance values. Enter your own counts below.');
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setAnnouncement(message), 350);
    return () => clearTimeout(timer);
  }, [message]);
  useEffect(() => {
    if (!undoGhost) return;
    const timer = setTimeout(() => setUndoGhost(null), 500);
    return () => clearTimeout(timer);
  }, [undoGhost]);

  function update(name: FieldName, value: string) {
    setChangeReadout(null);
    setPresetNotice('');
    setDirection('edit'); setPreview(null); setPreviewCount(1); setUndoGhost(null); setFeedback('Counts adjusted. A new run starts here.');
    setSession(current => ({ fields: { ...current.fields, [name]: value }, events: [] }));
  }
  function switchSubject() {
    setChangeReadout(null);
    saved.startTemporary(null); setPresetNotice(''); setDirection('edit'); setPreview(null); setPreviewCount(1); setUndoGhost(null); setTouched({}); setFeedback('Ready for the next class.');
  }
  function reset() {
    switchSubject();
    if (saved.state.activeId || saved.temporary) saved.startTemporary({ fields: { ...initial }, events: [] });
    else setSession({ fields: { ...initial }, events: [] });
    totalRef.current?.focus();
  }
  function choosePreview(value: InstrumentState['preview']) { setDirection('future'); setPreview(value); if (value === null) setPreviewCount(1); }
  function record(kind: ClassKind) {
    setDirection(kind); setPreview(null); setPreviewCount(1); setUndoGhost(null);
    setSession(current => {
      const updated = applyClass(current.fields, kind);
      if (!updated) return current;
      const before = parseAttendance(current.fields), after = parseAttendance(updated);
      if (before.valid && after.valid) setChangeReadout({ before: calculateAttendance(before.value).percentage ?? '—', after: calculateAttendance(after.value).percentage ?? '—', kind });
      return appendClass(current, kind, new Date().toISOString()) ?? current;
    });
    setFeedback(kind === 'present' ? 'Present recorded. +1 attended · +1 held.' : 'Absent recorded. +1 held · attended unchanged.');
  }
  function undo() {
    setChangeReadout(null);
    setDirection('undo'); setPreview(null); setPreviewCount(1);
    setUndoGhost(session.events.at(-1) ?? null);
    setSession(current => {
      const last = current.events.at(-1);
      return last ? { fields: last.before, events: current.events.slice(0, -1) } : current;
    });
    setFeedback('Last class undone. Counts restored.');
  }
  function recordSubject(id: string, kind: ClassKind) {
    if (!saved.temporary && saved.state.activeId === id) { record(kind); return; }
    saved.change(state => ({ ...state, subjects: state.subjects.map(subject => subject.id === id ? { ...subject, session: appendClass(subject.session, kind, new Date().toISOString()) ?? subject.session } : subject) }));
  }
  function undoSubject(id: string) {
    if (!saved.temporary && saved.state.activeId === id) { undo(); return; }
    saved.change(state => ({ ...state, subjects: state.subjects.map(subject => {
      const last = subject.session.events.at(-1);
      return subject.id === id && last ? { ...subject, session: { fields: last.before, events: subject.session.events.slice(0, -1) } } : subject;
    }) }));
  }
  function error(name: FieldName) {
    if (parsed.valid) return undefined;
    const issue = parsed.issues[name];
    return issue && (touched[name] || issue.kind === 'invalid') ? issue.message : undefined;
  }
  function countInput(name: 'total' | 'attended' | 'remaining', label: string, placeholder: string) {
    const issue = error(name);
    return <div class="field">
      <label for={name}>{label}</label>
      <div class="count-stepper"><button type="button" class="step-button" aria-label={`Decrease ${label.toLowerCase()}`} disabled={!saved.ready || steppedCount(fields, name, -1) === null} onClick={() => { const next = steppedCount(fields, name, -1); if (next !== null) update(name, next); }}><Icon name="minus" size={16}/></button><input ref={name === 'total' ? totalRef : null} id={name} name={name} type="text" inputMode="numeric" autoComplete="off" maxLength={32}
        disabled={!saved.ready} value={fields[name]} data-long={fields[name].trim().length > 6} placeholder={placeholder} aria-invalid={Boolean(issue)} aria-describedby={issue ? `${name}-error` : name === 'remaining' ? 'remaining-help' : 'counts-help'}
        onInput={event => update(name, event.currentTarget.value)} onBlur={() => setTouched(current => ({ ...current, [name]: true }))} /><button type="button" class="step-button" aria-label={`Increase ${label.toLowerCase()}`} disabled={!saved.ready || steppedCount(fields, name, 1) === null} onClick={() => { const next = steppedCount(fields, name, 1); if (next !== null) update(name, next); }}><Icon name="plus" size={16}/></button></div>
      {issue && <p id={`${name}-error`} class="field-error">{issue}</p>}
    </div>;
  }
  return <>
    {appMode && <SubjectDashboard saved={saved} onRecord={recordSubject} onUndo={undoSubject} onOpen={id => { saved.change(state => ({ ...state, activeId: id })); switchSubject(); document.getElementById('saved-subject')?.focus(); }} onAdd={() => { switchSubject(); saved.startTemporary({ fields: { ...initial }, events: [] }); totalRef.current?.focus(); }} />}
    <div class="calculator-workspace" id="calculator" data-native={appMode} ref={workspace} data-tone={instrumentState.tone} data-preview={activePreview ?? 'current'} data-direction={direction}>
      <form class="calculator-inputs" onSubmit={event => { event.preventDefault(); setTouched({ total: true, attended: true, target: true, remaining: true }); }} noValidate>
        {appMode && <header class="subject-context">
          <SubjectPicker saved={saved} onSwitch={switchSubject} />
          {parsed.valid && result && status && <div class="mobile-status" data-tone={resultTone(parsed.value, result)}><strong><NumberReadout value={result.percentage ?? '—'}/><small>{result.percentage !== null ? '%' : ''}</small></strong><span><Icon name={status.icon} size={13}/>{status.label}</span></div>}
        </header>}
        {appMode && <><div class="class-actions" role="group" aria-label="Record a class for the selected subject">
          <button class="class-action class-action--present" type="button" disabled={!canRecord} onClick={() => record('present')}><span class="action-icon"><Icon name="check" size={26}/></span><span>Present<small>Attended this class</small></span></button>
          <button class="class-action class-action--absent" type="button" disabled={!canRecord} onClick={() => record('absent')}><span class="action-icon"><Icon name="close" size={26}/></span><span>Absent<small>Missed this class</small></span></button>
        </div>
        <div class="session-row"><span class="session-feedback" role="status">{canRecord || session.events.length ? feedback : parsed.valid && parsed.value.remaining === 0 ? 'Term complete. Update remaining classes to continue.' : parsed.valid && parsed.value.total === MAX_CLASSES ? 'Class limit reached.' : 'Enter valid counts to update a class.'}</span><button type="button" class="undo-button" disabled={!saved.ready || !session.events.length} onClick={undo}>Undo <span aria-hidden="true">↶</span></button></div>
        {changeReadout && <div class="class-change" data-kind={changeReadout.kind} role="status" aria-atomic="true"><span>{changeReadout.kind === 'present' ? '✓ Present' : '× Absent'}</span><strong>{changeReadout.before}% <span aria-hidden="true">→</span><span class="sr-only">to</span> {changeReadout.after}%</strong></div>}
        </>}
        {parsed.valid && result && <div class="mobile-answer" data-tone={resultTone(parsed.value, result)}><span>Your next move · {targetLabel(parsed.value)}% target</span>{nextRun !== null ? <><div class="mobile-next-metric" aria-hidden="true"><b><NumberReadout value={nextRun.toLocaleString('en-IN')}/></b><span>{result.state === 'recovery' ? 'classes to attend in a row' : 'consecutive classes you can miss'}</span></div><strong class="sr-only">{resultMessage(parsed.value, result)}</strong></> : <strong>{resultMessage(parsed.value, result)}</strong>}<a href="#result-title">See the breakdown <span aria-hidden="true">↓</span></a></div>}

        <div class="form-heading"><h2>Your numbers.</h2><button class="text-button" type="button" disabled={!saved.ready} onClick={reset}>{saved.state.activeId ? 'New calculation' : 'Reset'} <span aria-hidden="true">↺</span></button></div>
        <p class="form-intro" id="counts-help">Use the lecture counts from your college record.</p>
        {!parsed.valid && !hasInvalid && <div class="quick-start"><span>Enter two counts. Your answer updates instantly.</span><button class="example-button" disabled={!saved.ready} type="button" onClick={() => { setDirection('present'); setPreview(null); setPreviewCount(1); setUndoGhost(null); setSession({ fields: { attended: '90', total: '110', target: defaultTarget, remaining: '' }, events: [] }); setFeedback('Example loaded. Try a class.'); setTouched({}); }}>Try an example <span aria-hidden="true">↗</span></button></div>}
        {presetNotice && <p class="field-help" role="status">{presetNotice}</p>}
        <div class="count-fields">
          {countInput('total', 'Classes held', 'e.g. 110')}
          {countInput('attended', 'You attended', 'e.g. 90')}
        </div>
        {appMode && !saved.state.subjects.length && <ol class="discovery-steps" aria-label="Getting started"><li><b>1</b> Enter counts</li><li><b>2</b> See your next move</li><li><b>3</b> Save & return</li></ol>}
        {appMode && parsed.valid && !saved.state.activeId && <button class="save-subject-cta" type="button" onClick={openSubjectEditor}><span aria-hidden="true">＋</span> Save this subject <small>Name it. Pick up here next time.</small></button>}
        <div class="target-section">
          <div class="target-heading"><label for="target">Required attendance</label><div class="percent-input"><input disabled={!saved.ready} id="target" name="target" type="text" inputMode={fields.target === '2/3' ? 'text' : 'decimal'} autoComplete="off" maxLength={16} value={fields.target}
            aria-invalid={Boolean(error('target'))} aria-describedby={error('target') ? 'target-error' : 'target-help'}
            onInput={event => update('target', event.currentTarget.value)} onBlur={() => setTouched(current => ({ ...current, target: true }))} />{fields.target !== '2/3' && <span aria-hidden="true">%</span>}</div></div>
          {error('target') && <p class="field-error" id="target-error">{error('target')}</p>}
          <div class="target-presets" role="group" aria-label="Common target percentages">{presets.map(target => <button type="button" disabled={!saved.ready} key={target} aria-pressed={fields.target === target} onClick={() => update('target', target)}>{target === '2/3' ? 'Exact 2/3' : `${target}%`}</button>)}{!presets.includes('2/3') && <button type="button" disabled={!saved.ready} aria-pressed={fields.target === '2/3'} onClick={() => update('target', '2/3')}>Exact 2/3</button>}<button type="button" aria-pressed={!presets.includes(fields.target) && fields.target !== "2/3"} onClick={() => { const input = document.getElementById("target") as HTMLInputElement | null; input?.focus(); input?.select(); }}>Own %</button></div>
          <details class="input-guidance"><summary>Which target should I use?</summary><p class="field-help" id="target-help">{targetHelp}</p></details>
        </div>
        <details class="remaining-details">
          <summary><Icon name="calendar"/><span>Plan to the end of term <small>{fields.remaining.trim() ? `${fields.remaining} left` : 'Optional'}</small></span><span class="expand-icon" aria-hidden="true">+</span></summary>
          <div class="remaining-content">{countInput('remaining', 'Classes remaining', 'e.g. 20')}<p id="remaining-help" class="field-help">Upcoming lectures that count toward attendance. Leave blank if unknown; enter 0 if the term is complete.</p></div>
        </details>
        <div class="form-bottom"><span class="privacy-dot" aria-hidden="true" /><p>{!appMode ? 'Calculated on your device. Use a result link to keep or share these numbers.' : saved.temporary ? 'Separate calculation. Save as a subject to keep it.' : 'Attendance stays on this device. Back up important records below.'}</p></div>
      </form>
      <Instrument state={instrumentState}>
        {(appMode || activePreview) && <div class={`class-ribbon ${activePreview ? 'class-ribbon--future' : ''}`}>
          <div class="ribbon-label"><span>{activePreview ? 'A possible next chapter' : 'Recent classes · last 12'}</span><span>{activePreview ? `${runLength} ahead` : `${Math.min(12, session.events.length)} shown`}</span></div>
          <div class="class-track" role="group" aria-label={activePreview ? 'Previewed future classes' : 'Recent session class events'}>
            {activePreview ? Array.from({ length: runLength }, (_, i) => <span class={`event-tile event-tile--${activePreview} event-tile--future`} key={`future-${i}`} style={{ '--tile-order': i }}><span aria-hidden="true">{activePreview === 'present' ? '✓' : '×'}</span><small>{i + 1}</small></span>) : session.events.length ? session.events.slice(-12).map((event, index) => <span key={event.id} role="img" class={`event-tile event-tile--${event.kind}`} style={{ '--tile-order': index }} aria-label={`${event.kind}, class ${Number(event.before.total) + 1}`} title={`${event.kind === 'present' ? '✓ Present' : '× Absent'} · Class ${Number(event.before.total) + 1}`}><span aria-hidden="true">{event.kind === 'present' ? '✓' : '×'}</span><small>{Number(event.before.total) + 1}</small></span>) : <><Icon name="history" size={18}/><span class="ribbon-empty">Mark a class to start your history.</span></>}
            {undoGhost && !activePreview && <span class={`event-tile event-tile--${undoGhost.kind} event-tile--undo`} aria-hidden="true" key={`undo-${undoGhost.id}`}>{undoGhost.kind === 'present' ? '+' : '−'}</span>}
          </div>
        </div>}
      </Instrument>
      {parsed.valid && result ? <Result sharePath={sharePath} input={parsed.value} result={result} preview={activePreview} onPreview={choosePreview} previewCount={runLength} maxPreview={maxPreview} onPreviewCount={count => { setDirection('future'); setPreviewCount(count); setPreview(current => current ?? 'present'); }} futureResult={futureResult} /> : <section class="result result--empty" aria-labelledby="empty-heading">
        <div class="result-top"><span class="eyebrow">Your next move</span><span class="status-label">{hasInvalid ? 'Check your inputs' : 'Ready when you are'}</span></div>
        <h2 id="empty-heading">{hasInvalid ? 'Let’s get the counts right.' : <>Less guessing. <br />More perspective.</>}</h2>
        <p>{hasInvalid ? 'Correct the highlighted fields to get an accurate answer. We won’t guess or round your class counts.' : 'Enter your attendance to see what you can miss—or what you need to attend.'}</p>
      </section>}
    </div>
    <p class="sr-only" role="status" aria-atomic="true">{announcement}</p>
    {appMode ? <SavedControls saved={saved} onSwitch={switchSubject} /> : <LegacyBackup />}
    <p class="calculator-note"><span aria-hidden="true">↳</span> Planning, not permission. Your institution’s record and attendance policy are the final word.</p>
  </>;
}
