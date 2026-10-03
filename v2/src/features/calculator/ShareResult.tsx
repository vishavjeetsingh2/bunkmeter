import { useState } from 'preact/hooks';
import type { AttendanceInput } from '../../domain/attendance';
import { createAttendanceShare } from './sharing';
import { nativeServices } from '../../platform';

export default function ShareResult({ input, path }: { input: AttendanceInput; path: string }) {
  const [status, setStatus] = useState('');
  const [manual, setManual] = useState(false);
  const [busy, setBusy] = useState(false);
  const share = createAttendanceShare(input, path);
  const copyText = `${share.summary} Check yours: ${share.url}`;
  async function copy() {
    try { await navigator.clipboard.writeText(copyText); setStatus('Result and link copied.'); setManual(false); }
    catch { setManual(true); setStatus('Copy is unavailable. Select and copy the result below.'); }
  }
  async function send() {
    setBusy(true); setStatus(''); setManual(false);
    try {
      const native = nativeServices();
      if (native) {
        try { await native.share({ title: share.title, text: share.text, url: share.url }); setStatus('Share sheet closed.'); }
        catch { setStatus('Sharing closed or unavailable. You can copy the link instead.'); }
        return;
      }
      if (typeof navigator.share === 'function') {
        try { await navigator.share({ title: share.title, text: share.text, url: share.url }); setStatus('Share sheet closed.'); return; }
        catch (error) { if (error instanceof Error && error.name === 'AbortError') { setStatus('Sharing cancelled.'); return; } }
      }
      await copy();
    } finally { setBusy(false); }
  }
  return <aside class="share-result" aria-label="Share attendance result">
    <div><button type="button" class="text-button" disabled={busy} onClick={() => { void send(); }}>Share Result <span aria-hidden="true">↗</span></button><button type="button" class="text-button" disabled={busy} onClick={() => { void copy(); }}>Copy result link</button></div>
    <p class="share-note">The link includes these counts, target and any remaining classes.</p>
    <p class="share-status" role="status">{status}</p>
    {manual && <><label for="share-copy" class="sr-only">Result and link to copy</label><textarea id="share-copy" readOnly value={copyText} onFocus={event => event.currentTarget.select()} rows={4} /></>}
  </aside>;
}
