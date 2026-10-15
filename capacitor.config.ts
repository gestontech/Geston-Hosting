import type { CapacitorConfig } from '@capacitor/cli';

const isDevelopment = process.env.NODE_ENV === 'development';

const config: CapacitorConfig = {
  appId: 'online.gestontech.hosting',
  appName: 'Geston Hosting',
  webDir: 'dist',

  server: {
    androidScheme: 'https',

    ...(isDevelopment && {
      url: 'http://localhost:5173',
      cleartext: true,
    }),
  },

  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
