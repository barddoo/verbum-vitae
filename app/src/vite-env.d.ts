/// <reference types="vite/client" />

declare const __APP_VERSION__: string

declare module 'virtual:pwa-register/react' {
  import type { Dispatch, SetStateAction } from 'react'

  interface RegisterSWOptions {
    onNeedRefresh?: () => void
    onOfflineReady?: () => void
    onRegisteredSW?: (swUrl: string, registration?: ServiceWorkerRegistration) => void
    onRegisterError?: (error: unknown) => void
  }

  export function useRegisterSW(options?: RegisterSWOptions): {
    needRefresh: [boolean, Dispatch<SetStateAction<boolean>>]
    offlineReady: [boolean, Dispatch<SetStateAction<boolean>>]
    updateServiceWorker: (reloadPage?: boolean) => Promise<void>
  }
}

declare module '@fontsource-variable/fraunces'
declare module '@fontsource-variable/nunito'
