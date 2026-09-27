/** Whole counted lectures, never calendar days. All threshold decisions use integers. */
export const MAX_CLASSES = 1_000_000_000;
const SCALE = 10_000n;

export interface AttendanceInput {
  attended: number;
  total: number;
  targetBasisPoints: number;
  remaining: number | null;
}

export type AttendanceState = 'empty' | 'above' | 'at-target' | 'recovery' | 'unreachable' | 'perfect-unreachable';
export interface AttendanceResult {
  state: AttendanceState;
  percentage: string | null;
  /** Unbounded only when target is zero and remaining is unknown. */
  canMiss: bigint | null;
  /** Null means exact 100% cannot be recovered in finitely many future classes. */
  mustAttend: bigint | null;
  requiredAtCurrentTotal: bigint;
  nextPresent: string;
  nextAbsent: string;
  semester: {
    bestPercentage: string | null;
    required: bigint;
    canMiss: bigint | null;
    reachable: boolean;
  } | null;
}

const ceilDiv = (numerator: bigint, denominator: bigint): bigint =>
  numerator <= 0n ? 0n : (numerator + denominator - 1n) / denominator;

/** Truncate display to two places: a below-target ratio must not look safely rounded up. */
export function percentage(attended: bigint, total: bigint): string | null {
  if (total === 0n) return null;
  const hundredths = (attended * SCALE) / total;
  return `${hundredths / 100n}.${(hundredths % 100n).toString().padStart(2, '0')}`;
}

export function calculateAttendance(input: AttendanceInput): AttendanceResult {
  for (const count of [input.attended, input.total, ...(input.remaining === null ? [] : [input.remaining])]) {
    if (!Number.isSafeInteger(count) || count < 0 || count > MAX_CLASSES) throw new RangeError('Invalid class count.');
  }
  if (input.attended > input.total) throw new RangeError('Attended exceeds held.');
  if (!Number.isInteger(input.targetBasisPoints) || input.targetBasisPoints < 0 || input.targetBasisPoints > 10_000) {
    throw new RangeError('Invalid target.');
  }

  const a = BigInt(input.attended);
  const t = BigInt(input.total);
  const q = BigInt(input.targetBasisPoints);
  const r = input.remaining === null ? null : BigInt(input.remaining);
  const balance = SCALE * a - q * t;
  const mustAttend = balance >= 0n ? 0n : q === SCALE ? null : ceilDiv(-balance, SCALE - q);
  const immediate = q === 0n ? null : balance < 0n ? 0n : (SCALE * a) / q - t;
  const canMiss = r === null ? immediate : immediate === null || immediate > r ? r : immediate;
  const required = r === null ? null : ceilDiv(q * (t + r) - SCALE * a, SCALE);
  const semester = r === null || required === null ? null : {
    bestPercentage: percentage(a + r, t + r),
    required,
    canMiss: required > r ? null : r - required,
    reachable: required <= r,
  };
  const state: AttendanceState = t === 0n ? 'empty'
    : mustAttend === null ? 'perfect-unreachable'
    : semester && !semester.reachable ? 'unreachable'
    : balance < 0n ? 'recovery'
    : balance === 0n ? 'at-target' : 'above';

  return {
    state, percentage: percentage(a, t), canMiss, mustAttend,
    requiredAtCurrentTotal: ceilDiv(q * t, SCALE),
    nextPresent: percentage(a + 1n, t + 1n)!,
    nextAbsent: percentage(a, t + 1n)!,
    semester,
  };
}
