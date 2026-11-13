import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gringotts.app',
  appName: 'Gringotts',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    Camera: {
      permissionsType: 'prompt',
    },
  },
};

export default config;
