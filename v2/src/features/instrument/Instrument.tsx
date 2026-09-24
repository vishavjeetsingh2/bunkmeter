import { useEffect, useId, useRef, useState } from 'preact/hooks';
import { dialAngle, tones, type InstrumentState } from './motion';
import type { InstrumentScene } from './scene';
import './instrument.css';

function StillInstrument({ state }: { state: InstrumentState }) {
  const id = useId();
  const point = (ratio: number, radius = 112) => {
    const a = dialAngle(ratio); return [160 + Math.cos(a) * radius, 160 - Math.sin(a) * radius];
  };
  const [tx, ty] = point((state.target ?? 0) / 100, 125);
  return <svg class="instrument-still" viewBox="0 0 320 330" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-rim`} x2=".8" y2="1"><stop stop-color="#607273"/><stop offset=".3" stop-color="#263b40"/><stop offset=".62" stop-color="#172c31"/><stop offset="1" stop-color="#637573"/></linearGradient>
      <radialGradient id={`${id}-face`} cx=".35" cy=".2" r=".9"><stop stop-color="#fcfcf2"/><stop offset="1" stop-color="#dce2d7"/></radialGradient>
    </defs>
    <ellipse cx="166" cy="296" rx="115" ry="16" fill="#17393b" opacity=".1"/>
    <circle cx="160" cy="166" r="148" fill="#21373a"/>
    <circle cx="160" cy="160" r="148" fill={`url(#${id}-rim)`} stroke="#8d9994" stroke-width="1"/>
    <circle cx="160" cy="160" r="132" fill={`url(#${id}-face)`} stroke="#102d30" stroke-width="3"/>
    {Array.from({ length: 51 }, (_, i) => {
      const [x, y] = point(i / 50, 126); const [x2, y2] = point(i / 50, i % 5 === 0 ? 120 : 123);
      return <line key={i} x1={x} y1={y} x2={x2} y2={y2} stroke="#819084" stroke-width={i % 5 === 0 ? 1.3 : .6}/>;
    })}
    <path d="M80.8 239.2 A112 112 0 1 1 239.2 239.2" fill="none" stroke="#c3cdbf" stroke-width="9" stroke-linecap="round" pathLength="100"/>
    {state.value !== null && state.ratio > 0 && <path d="M80.8 239.2 A112 112 0 1 1 239.2 239.2" fill="none" stroke={tones[state.tone]} stroke-width="9" stroke-linecap="round" pathLength="100" stroke-dasharray={`${state.ratio * 100} 100`}/>}
    {state.target !== null && <circle cx={tx} cy={ty} r="4" fill="#a96d22" stroke="#f4d59b" stroke-width="1.5"/>}
    <text x="160" y="135" text-anchor="middle" font-size="8" letter-spacing="1.5" fill="#556962">{state.preview ? 'NEXT CLASS PREVIEW' : 'ATTENDANCE'}</text>
    <text x="160" y="178" text-anchor="middle" font-size="36" font-weight="500" letter-spacing="-1.5" fill="#173a40">{state.value === null ? '—' : `${state.value}%`}</text>
    <text x="160" y="202" text-anchor="middle" font-size="9" fill="#556962">{state.target === null ? 'Set your target' : `TARGET ${state.target}%`}</text>
    <text x="160" y="269" text-anchor="middle" font-size="8" font-weight="700" letter-spacing="2" fill="#173a40">BUNKMETER</text>
  </svg>;
}

export default function Instrument({ state }: { state: InstrumentState }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const controller = useRef<InstrumentScene | null>(null);
  const latest = useRef(state); latest.current = state;
  const [interactive, setInteractive] = useState(false);
  const [still, setStill] = useState(false);
  const [eligible, setEligible] = useState(false);

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const update = () => setEligible(!media.matches && !connection?.saveData && navigator.hardwareConcurrency !== 1 && navigator.hardwareConcurrency !== 2);
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!eligible || still || !hostRef.current) return;
    const host = hostRef.current;
    let cancelled = false, started = false;
    let idle: number | undefined;
    const simplify = () => {
      if (cancelled) return;
      controller.current?.dispose(); controller.current = null;
      setInteractive(false); setStill(true);
    };
    async function enhance() {
      if (cancelled || started) return; started = true;
      try {
        // The normal calculator bundle never imports Three.js eagerly.
        const { createInstrument } = await import('./scene');
        if (cancelled) return;
        controller.current = createInstrument(host, latest.current, simplify);
        await controller.current.ready;
        if (cancelled || !controller.current) return;
        setInteractive(true);
      } catch { simplify(); }
    }
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting) || started || cancelled) return;
      if ('requestIdleCallback' in window) idle = window.requestIdleCallback(() => { void enhance(); }, { timeout: 1500 });
      else void enhance();
      observer.disconnect();
    }, { rootMargin: '80px' });
    observer.observe(host);
    return () => {
      cancelled = true; observer.disconnect();
      if (idle !== undefined) window.cancelIdleCallback(idle);
      controller.current?.dispose(); controller.current = null; setInteractive(false);
    };
  }, [eligible, still]);

  useEffect(() => { controller.current?.update(state); }, [state.value, state.ratio, state.target, state.tone, state.preview]);
  return <div class="instrument-display">
    <div class="instrument-heading"><span class="eyebrow">A clearer perspective</span>{eligible && <button type="button" class="view-toggle" aria-pressed={still} onClick={() => setStill(value => !value)}>{still ? 'Interactive view' : 'Still view'}<span aria-hidden="true">{still ? '↗' : '◌'}</span></button>}</div>
    <div class="instrument-stage" data-enhanced={interactive ? 'true' : 'false'}>
      <StillInstrument state={state}/>
      <div class="instrument-webgl" ref={hostRef} aria-hidden="true"/>
    </div>
    <div class="instrument-legend"><span><i class="arc-key" style={{ background: tones[state.tone] }} aria-hidden="true"/> {state.preview === 'present' ? 'If you attend next' : state.preview === 'absent' ? 'If you miss next' : 'Your attendance'}</span><span><i class="target-key" aria-hidden="true"/> {state.target === null ? 'Set a target' : `${state.target}% target`}</span></div>
  </div>;
}
