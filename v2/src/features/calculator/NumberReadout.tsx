/** Exact text is present immediately; digit motion never delays or rounds an answer. */
export default function NumberReadout({ value }: { value: string }) {
  return <span class="number-readout">{Array.from(value).map((digit, index) => <span class="number-window" key={index}><span class="number-glyph">{digit}</span></span>)}</span>;
}
