import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'online.bunkmeter.app', appName: 'BunkMeter', webDir: 'dist-mobile',
  // Keep this origin stable: IndexedDB is keyed to it across app upgrades.
  server: { hostname: 'localhost', androidScheme: 'https' },
  android: { allowMixedContent: false, backgroundColor: '#f5f4ee' },
  plugins: { SystemBars: { style: 'LIGHT', insetsHandling: 'css' } },
};
export default config;
