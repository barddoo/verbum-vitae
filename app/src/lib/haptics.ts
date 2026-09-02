import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

/**
 * Native Capacitor builds get real haptics; the PWA falls back to `navigator.vibrate`. Both are
 * best-effort — browsers may lack the API or ignore the call, so every path swallows errors.
 */
export function hapticImpact(style: ImpactStyle = ImpactStyle.Light) {
  if (Capacitor.isNativePlatform()) {
    void Haptics.impact({ style }).catch(() => {})
  } else if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(style === ImpactStyle.Heavy ? 30 : 10)
  }
}

export function hapticNotify(type: NotificationType) {
  if (Capacitor.isNativePlatform()) {
    void Haptics.notification({ type }).catch(() => {})
  } else if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    if (type === NotificationType.Success) navigator.vibrate([10, 40, 10])
    else if (type === NotificationType.Error) navigator.vibrate([30, 50, 30])
    else navigator.vibrate(15)
  }
}
