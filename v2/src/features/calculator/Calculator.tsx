import { useEffect, useRef, useState } from 'preact/hooks';
import { calculateAttendance } from '../../domain/attendance';
import { parseAttendance, type AttendanceFields, type FieldName } from '../../domain/validation';
import Result, { resultMessage } from './Result';
import './calculator.css';

const initial: AttendanceFields = { attended: '', total: '', target: '75', remaining: '' };

export default function Calculator() {
  const [fields, setFields] = useState<AttendanceFields>(initial);
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [announcement, setAnnouncement] = useState('');
  const totalRef = useRef<HTMLInputElement>(null);
  const parsed = parseAttendance(fields);
  const result = parsed.valid ? calculateAttendance(parsed.value) : null;
  const hasInvalid = !parsed.valid && Object.values(parsed.issues).some(issue => issue.kind === 'invalid');
  const message = parsed.valid && result ? resultMessage(parsed.value, result) : hasInvalid ? 'Check the highlighted fields. No result calculated.' : 'Enter classes held and attended to see your result.';

  useEffect(() => {
    const timer = setTimeout(() => setAnnouncement(message), 350);
    return () => clearTimeout(timer);
  }, [message]);

  function update(name: FieldName, value: string) { setFields(current => ({ ...current, [name]: value })); }
  function error(name: FieldName) {
    if (parsed.valid) return undefined;
    const issue = parsed.issues[name];
    return issue && (touched[name] || issue.kind === 'invalid') ? issue.message : undefined;
  }
  function countInput(name: 'total' | 'attended' | 'remaining', label: string, placeholder: string) {
    const issue = error(name);
    return <div class="field">
      <label for={name}>{label}</label>
      <input ref={name === 'total' ? totalRef : null} id={name} name={name} type="text" inputMode="numeric" autoComplete="off" maxLength={32}
        value={fields[name]} placeholder={placeholder} aria-invalid={Boolean(issue)} aria-describedby={issue ? `${name}-error` : name === 'remaining' ? 'remaining-help' : 'counts-help'}
        onInput={event => update(name, event.currentTarget.value)} onBlur={() => setTouched(current => ({ ...current, [name]: true }))} />
      {issue && <p id={`${name}-error`} class="field-error">{issue}</p>}
    </div>;
  }
  return <>
    <div class="calculator-workspace" id="calculator">
      <form class="calculator-inputs" onSubmit={event => { event.preventDefault(); setTouched({ total: true, attended: true, target: true, remaining: true }); }} noValidate>
        <div class="form-heading"><h2>Your numbers</h2><button class="text-button" type="button" onClick={() => { setFields({ ...initial }); setTouched({}); totalRef.current?.focus(); }}>Reset <span aria-hidden="true">↺</span></button></div>
        <p class="form-intro" id="counts-help">Use the lecture counts from your college record.</p>
        <div class="count-fields">
          {countInput('total', 'Classes held', 'e.g. 110')}
          {countInput('attended', 'You attended', 'e.g. 90')}
        </div>
        {parsed.valid && result && <div class="mobile-answer"><span>Your next move</span><strong>{resultMessage(parsed.value, result)}</strong><a href="#result-title">See the breakdown <span aria-hidden="true">↓</span></a></div>}
        <div class="target-section">
          <div class="target-heading"><label for="target">Required attendance</label><div class="percent-input"><input id="target" name="target" type="text" inputMode="decimal" autoComplete="off" maxLength={16} value={fields.target}
            aria-invalid={Boolean(error('target'))} aria-describedby={error('target') ? 'target-error' : 'target-help'}
            onInput={event => update('target', event.currentTarget.value)} onBlur={() => setTouched(current => ({ ...current, target: true }))} /><span aria-hidden="true">%</span></div></div>
          {error('target') && <p class="field-error" id="target-error">{error('target')}</p>}
          <div class="target-presets" role="group" aria-label="Common target percentages">{['75', '80', '85'].map(target => <button type="button" key={target} aria-pressed={fields.target === target} onClick={() => update('target', target)}>{target}%</button>)}<span>or enter your own</span></div>
          <p class="field-help" id="target-help">Use your course’s requirement. Rules vary by institution.</p>
        </div>
        <details class="remaining-details">
          <summary><span>Plan to the end of term <small>{fields.remaining.trim() ? `${fields.remaining} left` : 'Optional'}</small></span><span class="expand-icon" aria-hidden="true">+</span></summary>
          <div class="remaining-content">{countInput('remaining', 'Classes remaining', 'e.g. 20')}<p id="remaining-help" class="field-help">Upcoming lectures that count toward attendance. Leave blank if unknown; enter 0 if the term is complete.</p></div>
        </details>
        <div class="form-bottom"><span class="privacy-dot" aria-hidden="true" /><p>No signup. These numbers stay in this tab.</p></div>
      </form>
      {parsed.valid && result ? <Result input={parsed.value} result={result} /> : <section class="result result--empty" aria-labelledby="empty-heading">
        <div class="result-top"><span class="eyebrow">Your next move</span><span class="status-label">{hasInvalid ? 'Check your inputs' : 'Ready when you are'}</span></div>
        <div class="empty-graphic" aria-hidden="true"><span /><span /><span /><span /><i /></div>
        <h2 id="empty-heading">{hasInvalid ? 'Let’s get the counts right.' : <>A little clarity.<br />Before your next class.</>}</h2>
        <p>{hasInvalid ? 'Correct the highlighted fields to get an accurate answer. We won’t guess or round your class counts.' : 'Enter your attendance to see what you can miss—or what you need to attend.'}</p>
        {!hasInvalid && <button class="example-button" type="button" onClick={() => { setFields({ attended: '90', total: '110', target: '75', remaining: '' }); setTouched({}); }}>Try an example <span aria-hidden="true">↗</span></button>}
        <span class="empty-footnote">Clear numbers. No guesswork.</span>
      </section>}
    </div>
    <p class="sr-only" role="status" aria-atomic="true">{announcement}</p>
    <p class="calculator-note"><span aria-hidden="true">↳</span> Planning, not permission. Your institution’s record and attendance policy are the final word.</p>
  </>;
}
