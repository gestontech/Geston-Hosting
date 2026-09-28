import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'online.gestontech.hosting',
  appName: 'Geston Hosting',
  webDir: 'dist',

  server: {
    url: 'https://hosting.gestontech.online',
    cleartext: false
  }
};

export default config;
