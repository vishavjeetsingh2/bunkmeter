import { describe, expect, it } from 'vitest';
import { dialAngle, spring } from './motion';

describe('instrument presentation', () => {
  it('converges without overshooting and stops requesting motion', () => {
    const motion = spring(0);
    let previous = 0;
    for (let i = 0; i < 180; i++) {
      const next = motion.step(.75, 1 / 60);
      expect(next).toBeGreaterThanOrEqual(previous);
      expect(next).toBeLessThanOrEqual(.75);
      previous = next;
    }
    expect(motion.settled(.75)).toBe(true);
  });
  it('remains finite on interrupted frames and settles after a reversed input', () => {
    const motion = spring(.9);
    motion.step(.2, 10);
    for (let i = 0; i < 180; i++) expect(Number.isFinite(motion.step(1, 1 / 60))).toBe(true);
    expect(motion.value).toBe(1);
  });
  it('maps 0–100% clockwise across exactly 270 degrees', () => {
    expect(dialAngle(0) - dialAngle(1)).toBeCloseTo(Math.PI * 1.5);
    expect(dialAngle(-1)).toBe(dialAngle(0));
    expect(dialAngle(2)).toBe(dialAngle(1));
  });
});
