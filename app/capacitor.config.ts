/// <reference types="@capacitor/status-bar" />
/// <reference types="@capacitor/splash-screen" />

import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.verbumvitae.app',
  appName: 'Verbum Vitae',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'vvitae',
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      overlaysWebView: false,
      backgroundColor: '#0f1117',
    },
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#0f1117',
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
}

export default config
