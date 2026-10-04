import { percentage, type AttendanceInput, type AttendanceResult } from '../../domain/attendance';

/** Shared labels only; the attendance engine remains the source of truth. */
export function attendanceStatus(input: AttendanceInput, result: AttendanceResult) {
  if (result.state === 'empty') return { label: 'No classes yet', icon: 'minus' } as const;
  if (input.remaining === 0) return result.semester?.reachable
    ? { label: 'Term complete · target met', icon: 'check' } as const
    : { label: 'Term complete · below target', icon: 'warning' } as const;
  if (input.targetBasisPoints === 0) return { label: 'No minimum', icon: 'minus' } as const;
  if (result.state === 'unreachable' || result.state === 'perfect-unreachable') return { label: 'Target out of reach', icon: 'warning' } as const;
  if (result.state === 'recovery') return { label: 'Recovery needed', icon: 'recovery' } as const;
  if (result.canMiss === 0n) return { label: 'No skip buffer', icon: 'warning' } as const;
  return { label: 'Safe · on track', icon: 'check' } as const;
}

/** At most three exact, cumulative milestones, even for runs above Number.MAX_SAFE_INTEGER. */
export function classMilestones(input: AttendanceInput, run: bigint, recovering: boolean) {
  if (run <= 0n) return [];
  const steps = [...new Set([1n, 2n, 3n].map(part => (run * part + 2n) / 3n))];
  return steps.map(classes => {
    const attended = BigInt(input.attended) + (recovering ? classes : 0n);
    const total = BigInt(input.total) + classes;
    return { classes, attended, total, percentage: percentage(attended, total) };
  });
}
