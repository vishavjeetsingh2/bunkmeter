import { useEffect, useRef } from 'preact/hooks';
import type { RefObject } from 'preact';

/** Presentation only: DOM values are committed before any animation begins. */
export function useChoreography(root: RefObject<HTMLElement>, signature: string, direction: string) {
  const first = useRef(true);
  useEffect(() => {
    const host = root.current;
    if (!host) return;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const animations: Animation[] = [];
    const cancel = () => animations.forEach(animation => animation.cancel());
    media.addEventListener('change', cancel);
    if (!media.matches) {
      const entrance = first.current;
      const selectors = entrance ? ['.instrument-stage', '.calculator-inputs', '.result']
        : ['.number-glyph', '.decision h2', '.decision-unit', '.status-label', '.session-feedback', '.event-tile:last-child', '.future-outcome'];
      for (const [group, selector] of selectors.entries()) {
        host.querySelectorAll<HTMLElement>(selector).forEach((element, index) => {
          const reverse = direction === 'undo' || direction === 'absent';
          const offset = entrance ? 22 : reverse ? -12 : 12;
          animations.push(element.animate([
            { transform: `translate3d(0,${offset}px,0) rotateX(${reverse ? -8 : 8}deg)` },
            { transform: 'translate3d(0,-1px,0) rotateX(0)', offset: .72 },
            { transform: 'translate3d(0,0,0)' },
          ], { duration: entrance ? 800 : 460, delay: entrance ? group * 65 : Math.min(index * 18 + group * 12, 110), easing: 'cubic-bezier(.16,1,.3,1)' }));
        });
      }
      const light = host.querySelector<HTMLElement>('.instrument-light');
      if (light) animations.push(light.animate([{ opacity: .38 }, { opacity: .7, offset: .25 }, { opacity: .38 }], { duration: 900, easing: 'ease-out' }));
    }
    first.current = false;
    return () => { cancel(); media.removeEventListener('change', cancel); };
  }, [root, signature, direction]);
}
