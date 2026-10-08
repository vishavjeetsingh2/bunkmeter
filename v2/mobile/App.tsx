import { useEffect, useState } from 'preact/hooks';
import { Capacitor } from '@capacitor/core';
import { App as AndroidApp } from '@capacitor/app';
import { Share } from '@capacitor/share';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import Calculator from '../src/features/calculator/Calculator';
import { installNativeServices, waitForAttendanceSave } from '../src/platform';
import { attendanceFaq as faq } from '../src/content/faq';
import ProductNav from '../src/components/ProductNav';

if (Capacitor.isNativePlatform()) installNativeServices({
  share: async data => { await Share.share(data); },
  exportBackup: async (text, filename) => {
    const path = `backups/${filename}`;
    await Filesystem.writeFile({ directory: Directory.Cache, path, data: text, encoding: Encoding.UTF8, recursive: true });
    const { uri } = await Filesystem.getUri({ directory: Directory.Cache, path });
    await Share.share({ title: 'BunkMeter attendance backup', files: [uri] });
    // Keep the cache file until Android has finished handing it to the recipient.
    // The next export replaces it; Android may evict cache files at any time.
  },
});

export default function App() {
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const back = AndroidApp.addListener('backButton', () => { void (async () => {
      const focused = document.activeElement;
      if (focused instanceof HTMLInputElement || focused instanceof HTMLTextAreaElement) { focused.blur(); return; }
      const open = [...document.querySelectorAll<HTMLDetailsElement>('details[open]')].find(detail => {
        const bounds = detail.getBoundingClientRect();
        return bounds.bottom > 0 && bounds.top < window.innerHeight;
      });
      if (open) { open.open = false; open.querySelector('summary')?.focus(); return; }
      if (window.scrollY > 60) { window.scrollTo(0, 0); document.getElementById('app-title')?.focus({ preventScroll: true }); return; }
      if (!(await waitForAttendanceSave())) { setNotice('Some changes could not be saved. Export a backup before closing the app.'); document.getElementById('saved-tools')?.scrollIntoView(); return; }
      await AndroidApp.minimizeApp();
    })(); });
    // Capacitor forwards real visibility/lifecycle events to the WebView;
    // IndexedDB writes happen immediately, not only when the app is closed.
    return () => { void back.then(listener => listener.remove()); };
  }, []);
  return <>
    <header class="app-header"><a href="#subjects" aria-label="BunkMeter home"><svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true"><circle cx="16" cy="16" r="15" fill="currentColor"/><path d="M9 23a10 10 0 1 1 14 0" fill="none" stroke="#f2e5bc" stroke-width="2.5" stroke-linecap="round"/><path d="m21 11-5 5" stroke="#e6b667" stroke-width="2.5" stroke-linecap="round"/><circle cx="16" cy="16" r="2" fill="#e6b667"/></svg><strong id="app-title" tabIndex={-1}>BunkMeter</strong></a><ProductNav helpId="app-help" appMode/><span>Offline ready</span></header>
    <main id="main" class="app-content"><h1 class="sr-only">Your attendance companion</h1>{notice && <p class="app-alert" role="alert">{notice}</p>}<Calculator appMode />
      <section id="app-help" class="app-help" aria-labelledby="help-title"><h2 id="help-title" tabIndex={-1}>A little help</h2><p>Your app and browser keep separate records. Use Backup & transfer to move attendance between them. There is no account or automatic sync.</p>{faq.map(item => <details class="saved-details" key={item.question}><summary>{item.question}<span aria-hidden="true">+</span></summary><p class="saved-content">{item.answer}</p></details>)}<p>Attendance and subjects stay in this app. No ads, analytics or tracking SDKs are included. Uninstalling or clearing app data removes records; export a backup first.</p><a href="https://bunkmeter.online/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy policy ↗</a><a href="mailto:hello@bunkmeter.online">Contact support ↗</a></section>
    </main>
  </>;
}
