import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.9a7df55ccf114367ab0d5ed7f247add9',
  appName: 'panthers-court-vision',
  webDir: 'dist',
  server: {
    url: 'https://9a7df55c-cf11-4367-ab0d-5ed7f247add9.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    Camera: {
      permissions: ['camera', 'photos']
    },
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#000000',
      overlaysWebView: false
    }
  }
};

export default config;