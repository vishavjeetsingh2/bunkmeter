import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { recoveryCalendar, localDate, type CalendarSettings } from '../src/domain/recovery-calendar';
import type { AttendanceInput } from '../src/domain/attendance';

export type Plan = { id: string; name: string; input: AttendanceInput; settings: CalendarSettings; reminders: boolean };
export type Plans = { version: 1; time: string; plans: Plan[] };
const key = 'bunkmeter.recovery-plans.v1';
export const emptyPlans = (): Plans => ({ version: 1, time: '08:00', plans: [] });
export function readPlans(): Plans {
  const raw = localStorage.getItem(key);
  if (!raw) return emptyPlans();
  const data = JSON.parse(raw) as Plans;
  if (data.version !== 1 || !/^([01]\d|2[0-3]):[0-5]\d$/.test(data.time) || !Array.isArray(data.plans) || data.plans.length > 21) throw Error('Recovery plans could not be read. Existing plans have not been replaced.');
  const ids = new Set<string>();
  for (const plan of data.plans) {
    if (typeof plan.id !== 'string' || typeof plan.name !== 'string' || typeof plan.reminders !== 'boolean' || ids.has(plan.id)) throw Error('Invalid recovery plan.');
    recoveryCalendar(plan.input, plan.settings); ids.add(plan.id);
  }
  return data;
}
export function writePlans(data: Plans) { localStorage.setItem(key, JSON.stringify(data)); }
export async function allowReminders() {
  if (!Capacitor.isNativePlatform()) throw Error('Device reminders are available in the Android app. Your calendar works here too.');
  const permission = await LocalNotifications.requestPermissions();
  if (permission.display !== 'granted') throw Error('Notifications are off. You can allow them in Android settings; your calendar is still saved.');
}
let queue = Promise.resolve();
/** Serialize replacements; notifications are grouped by date across every subject. */
export function syncReminders(data: Plans): Promise<void> {
  const task = queue.catch(() => undefined).then(async () => {
    if (!Capacitor.isNativePlatform()) return;
    const pending = await LocalNotifications.getPending();
    const ours = pending.notifications.filter(item => item.id >= 620000 && item.id < 630000);
    if (ours.length) await LocalNotifications.cancel({ notifications: ours.map(({ id }) => ({ id })) });
    if ((await LocalNotifications.checkPermissions()).display !== 'granted') return;
    const totals = new Map<string, number>();
    for (const plan of data.plans.filter(plan => plan.reminders)) {
      for (const day of recoveryCalendar(plan.input, plan.settings).days) totals.set(day.date, (totals.get(day.date) ?? 0) + day.classes);
    }
    const [hours, minutes] = data.time.split(':').map(Number);
    const notifications = [...totals].sort(([a], [b]) => a.localeCompare(b)).map(([day, count], index) => {
      const at = localDate(day); at.setHours(hours!, minutes!, 0, 0);
      return { id: 620000 + index, title: 'Your recovery plan', body: `${count} planned ${count === 1 ? 'class' : 'classes'} today. Open BunkMeter to check your plan and record attendance.`, schedule: { at }, isExactNotification: false, channelId: 'recovery', extra: { screen: 'recovery' } };
    }).filter(item => item.schedule.at.getTime() > Date.now());
    await LocalNotifications.createChannel({ id: 'recovery', name: 'Recovery reminders', description: 'One daily reminder for your planned classes', importance: 3 });
    if (notifications.length) await LocalNotifications.schedule({ notifications });
  });
  queue = task; return task;
}

