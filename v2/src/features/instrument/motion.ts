/** Critically damped presentation motion. Never used to determine attendance. */
export function spring(value: number) {
  let position = value;
  let velocity = 0;
  return {
    get value() { return position; },
    step(target: number, elapsed: number) {
      const dt = Math.min(Math.max(elapsed, 0), 1 / 30);
      const offset = position - target;
      const rate = 15;
      const impulse = velocity + rate * offset;
      const decay = Math.exp(-rate * dt);
      position = target + (offset + impulse * dt) * decay;
      velocity = (velocity - rate * impulse * dt) * decay;
      if (Math.abs(position - target) < .0001 && Math.abs(velocity) < .001) {
        position = target; velocity = 0;
      }
      return position;
    },
    settled(target: number) { return position === target && velocity === 0; },
  };
}

export type InstrumentState = {
  value: string | null;
  ratio: number;
  target: number | null;
  tone: 'safe' | 'caution' | 'danger' | 'neutral';
  preview: 'present' | 'absent' | null;
};

export const tones = { safe: '#175b60', caution: '#93601c', danger: '#a64737', neutral: '#65716c' };
export const dialAngle = (ratio: number) => Math.PI * 1.25 - Math.PI * 1.5 * Math.max(0, Math.min(1, ratio));
