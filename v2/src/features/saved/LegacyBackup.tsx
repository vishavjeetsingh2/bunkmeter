import { useState } from 'preact/hooks';
import { openDatabase, readWorkspace } from './database';

/** Read-only exit path for records saved by the former website tracker. */
export default function LegacyBackup() {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  async function exportPrevious() {
    setBusy(true);
    let db: IDBDatabase | undefined;
    try {
      db = await openDatabase();
      const workspace = await readWorkspace(db);
      if (!workspace) { setNotice('No previous attendance records were found in this browser.'); return; }
      const url = URL.createObjectURL(new Blob([JSON.stringify(workspace, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url; link.download = `bunkmeter-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice('Backup download started. Keep this file safe; your browser records are unchanged.');
    } catch { setNotice('Could not read your previous records. They have not been changed. Try again in the browser where you saved them.'); }
    finally { db?.close(); setBusy(false); }
  }
  return <aside class="legacy-backup" id="saved-tools" aria-label="Previous website records">
    <details><summary>Previously saved attendance here?</summary>
      <p>The website now focuses on calculations. Your previous saved subjects and history have not been deleted. Export them before clearing browser data; keep the backup for transfer to the Android app when available.</p>
      <button type="button" disabled={busy} onClick={() => { void exportPrevious(); }}>{busy ? 'Reading previous records…' : 'Export previous attendance'}</button>
      <p role="status">{notice}</p>
    </details>
  </aside>;
}
