import { useState } from 'preact/hooks';
import { percentage, targetLabel, targetPercent, type AttendanceInput } from '../../domain/attendance';
import { classMilestones } from './presentation';
import Icon from '../../components/Icon';

const format = (n: bigint | number) => n.toLocaleString('en-IN');

/** A visual explanation only. All displayed milestones use the exact engine. */
export default function AttendanceJourney({ input, run, recovering }: { input: AttendanceInput; run: bigint; recovering: boolean }) {
  const [selected, setSelected] = useState(0);
  const steps = [{ classes: 0n, attended: BigInt(input.attended), total: BigInt(input.total), percentage: percentage(BigInt(input.attended), BigInt(input.total)) }, ...classMilestones(input, run, recovering)];
  const active = steps[Math.min(selected, steps.length - 1)]!;
  const x = (classes: bigint) => 28 + (run > 0n ? Number(classes) / Number(run) : 0) * 344;
  const y = (value: number) => 132 - value * 1.08;
  const points = steps.map(step => `${x(step.classes)},${y(Number(step.percentage))}`).join(' ');
  const targetY = y(targetPercent(input));
  return <div class="attendance-journey">
    <div class="journey-heading"><h3>{recovering ? 'Your path to recovery' : 'Your skip budget'}</h3><span><Icon name="target" size={13}/>{targetLabel(input)}% target</span></div>
    <p class="journey-hint">{run > 0n ? 'Tap a milestone to see the exact numbers.' : 'Attend the next class to build a buffer.'}</p>
    <svg class="journey-chart" viewBox="0 0 400 156" aria-hidden="true" focusable="false">
      {[0, 50, 100].map(value => <g key={value}><line x1="28" x2="372" y1={y(value)} y2={y(value)} class="journey-grid"/><text x="4" y={y(value) + 3}>{value}</text></g>)}
      <line x1="28" x2="372" y1={targetY} y2={targetY} class="journey-target"/>
      <polyline points={points} class="journey-line" pathLength="1"/>
      {steps.map((step, i) => <g key={step.classes.toString()} class={i === selected ? 'journey-point is-selected' : 'journey-point'}><circle cx={x(step.classes)} cy={y(Number(step.percentage))} r={i === selected ? 8 : 4}/><circle class="point-core" cx={x(step.classes)} cy={y(Number(step.percentage))} r="2"/></g>)}
      <text x="28" y="152">Now</text><text x="372" y="152" text-anchor="end">{run > 0n ? `${format(run)} classes ${recovering ? 'attended' : 'missed'}` : 'No skip buffer'}</text>
    </svg>
    <ol class="journey-stops" aria-label={recovering ? 'Consecutive attendance milestones' : 'Consecutive missed-class milestones'}>
      {steps.map((step, index) => <li key={step.classes.toString()}><button type="button" aria-pressed={selected === index} onClick={() => setSelected(index)} aria-label={index === 0 ? `Current attendance: ${step.percentage}%` : `${recovering ? 'Attend' : 'Miss'} ${format(step.classes)} classes: ${step.percentage}%`}><span>{index === 0 ? 'Now' : `${recovering ? '+' : '−'}${format(step.classes)}`}</span><small>{step.percentage}%</small></button></li>)}
    </ol>
    <div class="journey-detail" aria-live="polite" aria-atomic="true"><span>{active.classes === 0n ? 'Current record' : `After ${format(active.classes)} ${recovering ? 'attended' : 'missed'}`}<strong>{format(active.attended)} <small>/ {format(active.total)} classes</small></strong></span><b key={active.percentage}>{active.percentage}<small>%</small></b></div>
  </div>;
}
