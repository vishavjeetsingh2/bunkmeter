import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ getPending:vi.fn(), cancel:vi.fn(), checkPermissions:vi.fn(), requestPermissions:vi.fn(), createChannel:vi.fn(), schedule:vi.fn() }));
vi.mock('@capacitor/core', () => ({ Capacitor:{isNativePlatform:()=>true} }));
vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications:api }));
import { syncReminders, type Plans } from '../../mobile/recovery-store';
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-15T00:00:00'));vi.clearAllMocks();api.getPending.mockResolvedValue({notifications:[{id:620000},{id:5}]});api.checkPermissions.mockResolvedValue({display:'granted'});api.cancel.mockResolvedValue(undefined);api.createChannel.mockResolvedValue(undefined);api.schedule.mockResolvedValue({notifications:[]});});
afterEach(()=>vi.useRealTimers());
const data: Plans = {version:1,time:'08:00',plans:['a','b'].map(id=>({id,name:id,reminders:true,input:{total:100,attended:72,targetBasisPoints:7500,remaining:null},settings:{start:'2026-10-19',weekdays:[1,2,3,4,5],perDay:2}}))};
it('combines subjects into one daily reminder and never asks for permission implicitly',async()=>{
  await syncReminders(data);
  expect(api.cancel).toHaveBeenCalledWith({notifications:[{id:620000}]});
  const scheduled=api.schedule.mock.calls[0]![0].notifications;
  expect(scheduled).toHaveLength(6);
  expect(scheduled[0].body).toContain('4 planned classes');
  expect(scheduled[0].isExactNotification).toBe(false);
  expect(scheduled[0].schedule.at.getHours()).toBe(8);
  expect(api.requestPermissions).not.toHaveBeenCalled();
});
it('cancels obsolete reminders without scheduling when permission is denied',async()=>{
  api.checkPermissions.mockResolvedValue({display:'denied'});
  await syncReminders(data); expect(api.cancel).toHaveBeenCalled(); expect(api.schedule).not.toHaveBeenCalled();
});
it('cancels the last reminder when all plans are off',async()=>{
  await syncReminders({...data,plans:data.plans.map(plan=>({...plan,reminders:false}))});
  expect(api.cancel).toHaveBeenCalled(); expect(api.schedule).not.toHaveBeenCalled();
});
