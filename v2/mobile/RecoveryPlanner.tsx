import { useEffect, useState } from 'preact/hooks';
import { calculateAttendance, targetLabel, type AttendanceInput } from '../src/domain/attendance';
import { dateKey, localDate, recoveryCalendar, type CalendarSettings } from '../src/domain/recovery-calendar';
import { allowReminders, emptyPlans, readPlans, syncReminders, writePlans, type Plans } from './recovery-store';

const week = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const labelDate = (date: string) => localDate(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
export default function RecoveryPlanner({ input, subjectId, name, subjectIds, records }: { input: AttendanceInput | null; subjectId: string; name: string; subjectIds: string[]; records: Record<string, AttendanceInput | null> }) {
  const [store, setStore] = useState<Plans>(emptyPlans);
  const [ready, setReady] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState<CalendarSettings>({ start: dateKey(new Date()), weekdays: [1,2,3,4,5], perDay: 1 });
  const [month, setMonth] = useState(dateKey(new Date()).slice(0,7));
  const [selected, setSelected] = useState('');
  const saved = store.plans.find(plan => plan.id === subjectId);
  const signature = JSON.stringify(input);
  useEffect(() => { try { const data = readPlans(); setStore(data); } catch { setBlocked(true); setMessage('Saved plans could not be read. They have not been overwritten.'); } setReady(true); }, []);
  useEffect(() => {
    if (!ready || blocked) return;
    const current = store.plans.find(plan => plan.id === subjectId);
    const next = current?.settings ?? { start: dateKey(new Date()), weekdays: [1,2,3,4,5], perDay: 1 };
    setSettings(next); setMonth(next.start.slice(0,7)); setSelected('');
  }, [subjectId, ready]);
  // Old projections must not keep reminding after counts change or a subject is removed.
  useEffect(() => {
    if (!ready || blocked) return;
    const plans = store.plans.filter(plan => plan.id === 'quick' || subjectIds.includes(plan.id)).map(plan => JSON.stringify(plan.input) !== (plan.id === subjectId ? signature : JSON.stringify(records[plan.id])) ? { ...plan, reminders: false } : plan);
    if (JSON.stringify(plans) !== JSON.stringify(store.plans)) {
      const next = { ...store, plans };
      try { writePlans(next); setStore(next); void syncReminders(next).catch(() => setMessage('Reminder update failed. Check notification settings before relying on reminders.')); }
      catch { setMessage('Could not save the plan update.'); void syncReminders(emptyPlans()).catch(() => undefined); }
    }
  }, [signature, subjectId, subjectIds.join('|'), JSON.stringify(records), ready]);
  const result = input ? calculateAttendance(input) : null;
  let calendar: ReturnType<typeof recoveryCalendar> | null = null;
  let error = '';
    if (input) { try { calendar = recoveryCalendar(input, settings); } catch (e) { error = (e as Error).message; } }
  const days = calendar?.days ?? [];
  const stale = saved && JSON.stringify(saved.input) !== signature;
  const canPlan = Boolean(input && result?.state === 'recovery' && days.length && !error && settings.start >= dateKey(new Date()));
  async function save(reminders: boolean) {
    if (!input || !canPlan || blocked) return;
    setBusy(true); setMessage('');
    try {
      if (reminders) await allowReminders();
      const next: Plans = { ...store, plans: [...store.plans.filter(plan => plan.id !== subjectId), { id: subjectId, name, input, settings, reminders }] };
      writePlans(next); setStore(next); await syncReminders(next);
      setMessage(reminders ? 'Calendar saved. One combined reminder on each planned day.' : 'Calendar saved on this device. Reminders are off.');
    } catch (e) {
      // A partial native scheduling failure must not be presented as success.
      const off = { ...store, plans: store.plans.map(plan => plan.id === subjectId ? { ...plan, reminders: false } : plan) };
      try { writePlans(off); setStore(off); await syncReminders(off); } catch { /* Keep the visible failure; do not claim cancellation succeeded. */ }
      setMessage(`${(e as Error).message} Check Recovery before relying on reminders.`);
    } finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true);
    try { const next = { ...store, plans: store.plans.filter(plan => plan.id !== subjectId) }; writePlans(next); setStore(next); await syncReminders(next); setMessage('Plan removed. Its reminders are cancelled.'); }
    catch { setMessage('Could not remove all reminders. Check Android notification settings.'); } finally { setBusy(false); }
  }
  const first = localDate(`${month}-01`);
  const monthDays = new Date(first.getFullYear(), first.getMonth()+1, 0).getDate();
  const active = days.find(day => day.date === selected);
  function moveMonth(delta: number) { const date = new Date(first); date.setMonth(date.getMonth()+delta); setMonth(dateKey(date).slice(0,7)); }
  return <section class="recovery-studio" aria-labelledby="recovery-title">
    <div class="app-section-heading"><span class="app-eyebrow">02 / Your next move</span><h2 id="recovery-title">A plan you can follow.</h2><p>{name} · {input ? `${targetLabel(input)}% target` : 'Add your attendance first'}</p></div>
    <div class="recovery-hero"><span>{result?.state === 'recovery' ? 'Attend consecutively' : 'Attendance check'}</span><strong>{result?.state === 'recovery' ? result.mustAttend?.toLocaleString() : result?.percentage ? `${result.percentage}%` : '—'}</strong><p>{result?.state === 'recovery' ? 'classes to reach your target' : result?.state === 'unreachable' ? 'Not enough classes remain. Recheck your term estimate.' : result?.state === 'perfect-unreachable' ? 'A past absence cannot be recovered to an exact 100%.' : result?.state === 'above' || result?.state === 'at-target' ? 'You meet your target. No recovery needed.' : 'Enter held, attended and target in Calculate.'}</p></div>
    {stale && <p class="plan-notice" role="status">Your counts changed. Review and save a fresh plan; old reminders are off.</p>}
    {result?.state === 'recovery' && <>
      <div class="plan-controls"><label>Start from<input type="date" min={dateKey(new Date())} value={settings.start} onInput={e => { const start = e.currentTarget.value; setSettings({ ...settings, start }); if (/^\d{4}-\d{2}-\d{2}$/.test(start)) setMonth(start.slice(0,7)); }}/></label><label>Classes per selected day<input type="number" min="1" max="12" inputMode="numeric" value={settings.perDay} onInput={e => setSettings({ ...settings, perDay: Number(e.currentTarget.value) })}/></label></div>
      <fieldset class="class-days"><legend>When does this subject have class?</legend>{week.map((day,index) => <button type="button" aria-pressed={settings.weekdays.includes(index)} onClick={() => setSettings({ ...settings, weekdays: settings.weekdays.includes(index) ? settings.weekdays.filter(d => d !== index) : [...settings.weekdays,index] })}>{day}</button>)}</fieldset>
      <p class="plan-caption">Assumes you attend every scheduled class. Tap a date to exclude a holiday or cancelled class. Planning never marks actual attendance.</p>
      {error && <p role="alert">{error}</p>}
      {days.length > 0 && <div class="plan-calendar"><div class="calendar-heading"><button type="button" aria-label="Previous month" onClick={() => moveMonth(-1)}>‹</button><h3>{first.toLocaleDateString(undefined,{month:'long',year:'numeric'})}</h3><button type="button" aria-label="Next month" onClick={() => moveMonth(1)}>›</button></div><div class="calendar-grid">{week.map(day => <span class="calendar-weekday">{day[0]}</span>)}{Array.from({length:first.getDay()},(_,i) => <span key={`blank${i}`}/>)}{Array.from({length:monthDays},(_,i) => { const date = `${month}-${String(i+1).padStart(2,'0')}`; const day = days.find(d => d.date === date); return <button type="button" class={day ? 'planned-day' : ''} aria-pressed={selected===date} aria-label={`${labelDate(date)}${day ? `, attend ${day.classes}, projected ${day.percentage}%` : ', no planned class'}`} onClick={() => setSelected(date)}>{i+1}{day && <i aria-hidden="true"/>}</button>; })}</div><div class="calendar-detail" aria-live="polite">{active ? <><strong>{labelDate(active.date)} · Attend {active.classes}</strong><span>{active.attended}/{active.total} → {active.percentage}% projected</span></> : <span>Tap a highlighted date to see your progress.</span>}</div></div>}
      {selected && <button class="calendar-exclude" type="button" onClick={() => setSettings({ ...settings, excluded: settings.excluded?.includes(selected) ? settings.excluded.filter(date => date !== selected) : [...(settings.excluded ?? []), selected] })}>{settings.excluded?.includes(selected) ? 'Restore class on' : 'No class on'} {labelDate(selected)}</button>}
      {days.length > 0 && <p class="finish-line">{calendar?.complete ? <>Target reached by <strong>{labelDate(days.at(-1)!.date)}</strong> if you follow this schedule.</> : 'Showing the first 180 days. Your target takes longer; no finish date is promised.'}</p>}
      <label class="reminder-time">Daily reminder time<input type="time" value={store.time} onInput={e => { if(e.currentTarget.value) setStore({ ...store, time:e.currentTarget.value }); }}/></label>
      <p class="plan-caption">One reminder for all planned subjects. Android may delay delivery to save battery. Permission is requested only when you enable reminders.</p>
      <div class="plan-actions"><button type="button" disabled={!canPlan || busy || blocked} onClick={() => { void save(false); }}>Save calendar · no reminders</button><button type="button" class="app-primary" disabled={!canPlan || busy || blocked} onClick={() => { void save(true); }}>{busy ? 'Saving…' : 'Save & enable reminders'}</button></div>
    </>}
    {saved && <div class="plan-saved"><span>{saved.reminders && !stale ? 'Reminders enabled' : 'Saved plan · reminders off'}</span><button type="button" disabled={busy} onClick={() => { void remove(); }}>Remove plan</button></div>}
    <p role="status" class="plan-message">{message}</p>
  </section>;
}

