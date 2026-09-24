import type { AttendanceInput, AttendanceResult } from '../../domain/attendance';
import type { InstrumentState } from '../instrument/motion';

const number = (value: bigint | number) => value.toLocaleString('en-IN');

export function resultMessage(input: AttendanceInput, result: AttendanceResult): string {
  if (result.state === 'empty') return 'No classes recorded yet.';
  if (input.remaining === 0) return result.semester?.reachable ? 'Term complete. You meet your target.' : 'Term complete. You are below your target.';
  if (input.targetBasisPoints === 0) return 'No attendance minimum is set.';
  if (result.state === 'perfect-unreachable') return 'Exact 100% cannot be recovered after a missed class.';
  if (result.state === 'unreachable') return 'Your target is out of reach within the remaining classes.';
  if (result.state === 'recovery') return `Attend the next ${number(result.mustAttend!)} classes to reach your target.`;
  return result.canMiss === 0n ? 'No room to miss the next class.' : `You can miss ${number(result.canMiss!)} consecutive classes.`;
}

export function resultTone(input: AttendanceInput, result: AttendanceResult): InstrumentState['tone'] {
  if (result.state === 'empty' || input.targetBasisPoints === 0) return 'neutral';
  if (result.state === 'perfect-unreachable' || result.state === 'unreachable' || (input.remaining === 0 && !result.semester?.reachable)) return 'danger';
  return result.state === 'recovery' || result.canMiss === 0n ? 'caution' : 'safe';
}

export default function Result({ input, result, preview, onPreview }: { input: AttendanceInput; result: AttendanceResult; preview: InstrumentState['preview']; onPreview: (preview: InstrumentState['preview']) => void }) {
  const target = input.targetBasisPoints / 100;
  const finished = input.remaining === 0;
  const perfect = result.state === 'perfect-unreachable';
  const unreachable = result.state === 'unreachable';
  const recovering = result.state === 'recovery';
  const empty = result.state === 'empty';
  const noTarget = target === 0;
  const tone = resultTone(input, result);
  const status = empty ? 'No classes yet' : noTarget ? 'No minimum set' : perfect || unreachable ? 'Target out of reach' : recovering ? 'Below target' : result.state === 'at-target' ? 'Exactly at target' : 'Above target';
  let lead = 'You can miss';
  let figure = result.canMiss === null ? '—' : number(result.canMiss);
  let unit = result.canMiss === 1n ? 'consecutive class' : 'consecutive classes';
  let explanation = `Your attendance will stay at or above ${target}%, assuming no other changes.`;
  if (recovering) {
    lead = 'Attend the next'; figure = number(result.mustAttend!); unit = result.mustAttend === 1n ? 'class to recover' : 'classes to recover';
    explanation = `Attend every class in this run to reach ${target}%. A missed class changes the calculation.`;
  }
  if (perfect || unreachable) {
    lead = perfect ? 'A perfect record can’t be recovered' : 'Not enough classes left';
    figure = perfect ? '100%' : `${result.semester!.bestPercentage}%`;
    unit = perfect ? 'needs a perfect history' : 'best possible finish';
    explanation = perfect ? 'One missed class keeps the exact ratio below 100%, however many future classes you attend.'
      : `Even attending all ${number(input.remaining!)} remaining classes would leave you below ${target}%. Check your estimate and your institution’s policy.`;
  }
  if (noTarget) {
    lead = 'No minimum to meet'; figure = '0%'; unit = 'required attendance';
    explanation = 'A 0% target imposes no attendance minimum. Confirm that this is the requirement you intend to use.';
  }
  if (finished) {
    lead = 'No classes remaining'; figure = result.percentage === null ? '—' : `${result.percentage}%`; unit = 'final recorded attendance';
    explanation = result.semester?.reachable ? 'You meet your selected target based on these counts.' : 'Your recorded attendance is below your target. There are no remaining classes in this estimate.';
  }
  if (empty) {
    lead = 'A fresh start'; figure = '—'; unit = 'no classes recorded';
    explanation = 'With 0 classes held, there is no attendance percentage yet. Update the counts after your first class.';
  }
  return (
    <section class={`result result--${tone}`} aria-labelledby="result-title" data-testid="result">
      <div class="result-top"><span class="eyebrow">Your next move</span><span class="status-label"><span aria-hidden="true" />{status}</span></div>
      <div class="attendance-summary">
        <div><span class="metric-label">Current attendance</span><strong>{result.percentage ?? '—'}{result.percentage !== null && <span>%</span>}</strong></div>
        <span class="count-note">{number(input.attended)} of {number(input.total)}<br />{' '}classes attended</span>
      </div>
      <div class="decision">
        <h2 id="result-title">{lead}</h2>
        <p class={`decision-number ${figure.length > 10 ? 'decision-number--long' : ''}`}>{figure}</p>
        <p class="decision-unit">{unit}</p>
        <p class="decision-explanation">{explanation}</p>
      </div>
      {!finished && !empty && <div class="next-preview"><div class="preview-heading"><span>Explore your next class</span><span>Preview only · counts stay the same</span></div><div class="next-class" aria-label="Next class preview">
        <button type="button" aria-pressed={preview === null} onClick={() => onPreview(null)}><span>Current</span><strong>{result.percentage}%</strong></button>
        <button type="button" aria-pressed={preview === 'present'} onClick={() => onPreview('present')}><span>If you attend next <span aria-hidden="true">↗</span></span><strong>{result.nextPresent}%</strong></button>
        <button type="button" aria-pressed={preview === 'absent'} onClick={() => onPreview('absent')}><span>If you miss next <span aria-hidden="true">↘</span></span><strong>{result.nextAbsent}%</strong></button>
      </div><p class="sr-only" role="status">{preview === 'present' ? `Preview: attending next gives ${result.nextPresent}%. Your counts have not changed.` : preview === 'absent' ? `Preview: missing next gives ${result.nextAbsent}%. Your counts have not changed.` : ''}</p></div>}
      {result.semester && !finished && <div class="semester-note">
        <h3>Across your {number(input.remaining!)} remaining classes</h3>
        {result.semester.reachable ? <p>Attend at least <strong>{number(result.semester.required)}</strong>; you can miss <strong>{number(result.semester.canMiss!)}</strong> in total and finish at your target or higher. This is a term-end budget, not a consecutive-skip allowance.</p>
          : <p>You would need {number(result.semester.required)} attended classes among only {number(input.remaining!)} remaining. Revise the estimate if your schedule changes.</p>}
      </div>}
    </section>
  );
}
