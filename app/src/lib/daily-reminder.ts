import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'

const REMINDER_KEY = 'daily_reminder'
export const REMINDER_NOTIFICATION_ID = 1

export interface DailyReminder {
  enabled: boolean
  /** 0–23 */
  hour: number
  /** 0–59 */
  minute: number
}

export function loadReminder(): DailyReminder | null {
  const raw = localStorage.getItem(REMINDER_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as DailyReminder
    if (typeof parsed.hour !== 'number' || typeof parsed.minute !== 'number') return null
    return { enabled: !!parsed.enabled, hour: parsed.hour, minute: parsed.minute }
  } catch {
    return null
  }
}

export function saveReminder(r: DailyReminder) {
  localStorage.setItem(REMINDER_KEY, JSON.stringify(r))
}

/** Only native Capacitor builds can run scheduled local notifications. */
export function remindersAvailable(): boolean {
  return Capacitor.isNativePlatform()
}

/** Replace the daily reminder with `r`. Throws if permission is denied. */
export async function applyReminder(r: DailyReminder) {
  if (!remindersAvailable()) return

  const pending = await LocalNotifications.getPending()
  const ids = pending.notifications.map((n) => ({ id: n.id }))
  if (ids.length > 0) await LocalNotifications.cancel({ notifications: ids })

  if (!r.enabled) return

  const permission = await LocalNotifications.requestPermissions()
  if (permission.display !== 'granted') {
    throw new Error('permission-denied')
  }

  await LocalNotifications.schedule({
    notifications: [
      {
        id: REMINDER_NOTIFICATION_ID,
        title: 'Verbum Vitae',
        body: 'Hora da revisão — alguns minutos agora valem ouro para a memória.',
        schedule: { on: { hour: r.hour, minute: r.minute } },
      },
    ],
  })
}
