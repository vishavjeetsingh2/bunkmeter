import { targetPercent, type AttendanceInput } from '../../domain/attendance';

export default function CountBalance({ input }: { input: AttendanceInput }) {
  if (input.total === 0) return null;
  const attended = input.attended / input.total * 100;
  return <div class="count-balance" aria-label="Attendance breakdown">
    <div class="balance-labels"><span><i aria-hidden="true"/>Attended <strong>{input.attended.toLocaleString('en-IN')}</strong></span><span><i aria-hidden="true"/>Missed <strong>{(input.total - input.attended).toLocaleString('en-IN')}</strong></span></div>
    <div class="balance-track" aria-hidden="true"><span style={{ width: `${attended}%` }}/><i style={{ left: `${targetPercent(input)}%` }}/></div>
    <p>The marker is your required attendance.</p>
  </div>;
}
