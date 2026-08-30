/// <reference types="@capacitor/status-bar" />
/// <reference types="@capacitor/splash-screen" />
/// <reference types="@capacitor/haptics" />
/// <reference types="@capacitor/keyboard" />
/// <reference types="@capacitor/share" />

import type { CapacitorConfig } from '@capacitor/cli'
import { KeyboardResize, KeyboardStyle } from '@capacitor/keyboard'

const config: CapacitorConfig = {
  appId: 'com.vvitae.app',
  appName: 'Verbum Vitae',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'vvitae',
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
    },
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#0f1117',
      splashFullScreen: true,
      splashImmersive: true,
    },
    Keyboard: {
      resize: KeyboardResize.None,
      style: KeyboardStyle.Dark,
      resizeOnFullScreen: true,
    },
  },
}

export default config
