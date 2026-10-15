import { useEffect, useState } from 'preact/hooks';
import { Capacitor } from '@capacitor/core';
import { App as AndroidApp } from '@capacitor/app';
import { Share } from '@capacitor/share';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import Calculator from '../src/features/calculator/Calculator';
import { installNativeServices, waitForAttendanceSave } from '../src/platform';
import { attendanceFaq as faq } from '../src/content/faq';
import RecoveryPlanner from './RecoveryPlanner';
import { LocalNotifications } from '@capacitor/local-notifications';
import { readPlans, syncReminders } from './recovery-store';
import Icon from '../src/components/Icon';

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
  const [screen, setScreen] = useState<'calculate' | 'recovery' | 'subjects'>('calculate');
  function navigate(next: typeof screen) { setScreen(next); window.scrollTo(0,0); }
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listener = LocalNotifications.addListener('localNotificationActionPerformed', () => navigate('recovery'));
    try { void syncReminders(readPlans()).catch(() => setNotice('Could not refresh reminders. Open Recovery to check your plan.')); } catch { setNotice('Recovery plans need attention. Your attendance records are unchanged.'); }
    return () => { void listener.then(handle => handle.remove()); };
  }, []);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const back = AndroidApp.addListener('backButton', () => { void (async () => {
      const focused = document.activeElement;
      if (focused instanceof HTMLInputElement || focused instanceof HTMLTextAreaElement) { focused.blur(); return; }
      if (screen !== 'calculate') { navigate('calculate'); return; }
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
  }, [screen]);
  return <div class="native-app" data-screen={screen} onClickCapture={event => {
    const element = event.target instanceof Element ? event.target : null;
    const link = element?.closest('a')?.getAttribute('href');
    if (link === '#subject-editor' || link === '#saved-tools' || element?.closest('.save-subject-cta')) { setScreen('subjects'); requestAnimationFrame(() => document.getElementById(link === '#saved-tools' ? 'saved-tools' : 'subject-name')?.focus()); }
    if (link === '#calculator' || element?.closest('.subject-open,.add-subject')) { setScreen('calculate'); const add = element?.closest('.add-subject'); requestAnimationFrame(() => document.getElementById(add ? 'total' : 'saved-subject')?.focus()); }
  }}>
    <header class="app-header"><button class="app-brand" type="button" onClick={() => navigate('calculate')}><span aria-hidden="true">◴</span><strong id="app-title" tabIndex={-1}>BunkMeter</strong></button><span>On your device · Offline</span></header>
    <main id="main" class="app-content"><div class="app-welcome"><span class="app-eyebrow">{screen === 'calculate' ? '01 / Make it clear' : screen === 'subjects' ? '03 / Keep it together' : 'Your recovery studio'}</span><h1>{screen === 'calculate' ? 'Every class counts.' : screen === 'subjects' ? 'Your subjects.' : 'Make your comeback.'}</h1><p>{screen === 'calculate' ? 'Your numbers. Your next move.' : screen === 'subjects' ? 'Log, review and back up in one place.' : 'A few deliberate steps, one day at a time.'}</p></div>{notice && <p class="app-alert" role="alert">{notice}</p>}<Calculator appMode appPlan={(input, id, name, subjectIds, records) => <RecoveryPlanner input={input} subjectId={id} name={name} subjectIds={subjectIds} records={records}/>} />
      {screen === 'calculate' && <button type="button" class="app-primary plan-entry" onClick={() => navigate('recovery')}>Build my recovery calendar <span aria-hidden="true">→</span></button>}
      <section id="app-help" class="app-help" aria-labelledby="help-title"><h2 id="help-title" tabIndex={-1}>A little help</h2><p>Your app and browser keep separate records. Use Backup & transfer to move attendance between them. There is no account or automatic sync.</p>{faq.map(item => <details class="saved-details" key={item.question}><summary>{item.question}<span aria-hidden="true">+</span></summary><p class="saved-content">{item.answer}</p></details>)}<p>Attendance and subjects stay in this app. No ads, analytics or tracking SDKs are included. Uninstalling or clearing app data removes records; export a backup first.</p><a href="https://bunkmeter.online/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy policy ↗</a><a href="mailto:hello@bunkmeter.online">Contact support ↗</a></section>
    </main>
    <nav class="app-dock" aria-label="App navigation"><button type="button" aria-current={screen === 'calculate' ? 'page' : undefined} onClick={() => navigate('calculate')}><Icon name="calculator" size={20}/>Calculate</button><button type="button" aria-current={screen === 'recovery' ? 'page' : undefined} onClick={() => navigate('recovery')}><Icon name="calendar" size={20}/>Recovery</button><button type="button" aria-current={screen === 'subjects' ? 'page' : undefined} onClick={() => navigate('subjects')}><Icon name="subjects" size={20}/>Subjects</button></nav>
  </div>;
}

