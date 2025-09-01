import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.100in.basketball',
  appName: '100in-basketball',
  webDir: 'dist',
  server: {
    url: 'https://100in.app',
    cleartext: true
  },
  plugins: {
    Camera: {
      permissions: ['camera', 'photos']
    },
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#FF2A2A',
      overlaysWebView: false
    },
    SplashScreen: {
      launchShowDuration: 0,
      backgroundColor: '#FF2A2A',
      androidSpinnerStyle: 'small',
      iosSpinnerStyle: 'small'
    }
  }
};

export default config;