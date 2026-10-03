// The website never imports native libraries. Only the Android entry installs these adapters.
export interface NativeServices {
  share: (data: { title: string; text: string; url: string }) => Promise<void>;
  exportBackup: (text: string, filename: string) => Promise<void>;
}
let services: NativeServices | undefined;
let saveBarrier: (() => Promise<boolean>) | undefined;
export function installNativeServices(value: NativeServices) { services = value; }
export function nativeServices() { return services; }
export function setSaveBarrier(value: (() => Promise<boolean>) | undefined) { saveBarrier = value; }
export async function waitForAttendanceSave() { return saveBarrier ? saveBarrier() : true; }
