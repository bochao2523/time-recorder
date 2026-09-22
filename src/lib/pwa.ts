import type { ActiveTimerSession } from './timerStorage'

const TIMER_NOTIFICATION_KEY = 'time-tracker:timer-notifications'
const TIMER_NOTIFICATION_TAG = 'time-tracker-active-timers'

export type NotificationCapability = 'unsupported' | 'default' | 'denied' | 'granted'

export function getNotificationCapability(): NotificationCapability {
  if (
    typeof window === 'undefined' ||
    !('Notification' in window) ||
    !('serviceWorker' in navigator)
  ) return 'unsupported'
  return Notification.permission
}

export function getTimerNotificationsEnabled(): boolean {
  try {
    return localStorage.getItem(TIMER_NOTIFICATION_KEY) === 'enabled'
  } catch {
    return false
  }
}

export function setTimerNotificationsEnabled(enabled: boolean) {
  try {
    if (enabled) localStorage.setItem(TIMER_NOTIFICATION_KEY, 'enabled')
    else localStorage.removeItem(TIMER_NOTIFICATION_KEY)
  } catch {
    // Storage restrictions should not affect the timer itself.
  }
}

async function closeTimerNotification(registration?: ServiceWorkerRegistration) {
  const worker = registration ?? await navigator.serviceWorker.ready
  const notifications = await worker.getNotifications({ tag: TIMER_NOTIFICATION_TAG })
  notifications.forEach((notification) => notification.close())
}

export async function requestTimerNotifications(): Promise<NotificationCapability> {
  const capability = getNotificationCapability()
  if (capability === 'unsupported' || capability === 'denied') return capability
  const permission = capability === 'granted'
    ? 'granted'
    : await Notification.requestPermission()
  setTimerNotificationsEnabled(permission === 'granted')
  return permission
}

export async function disableTimerNotifications() {
  setTimerNotificationsEnabled(false)
  if (!('serviceWorker' in navigator)) return
  try {
    await closeTimerNotification()
  } catch {
    // Closing a notification is best effort only.
  }
}

export async function syncTimerNotification(sessions: readonly ActiveTimerSession[]) {
  if (
    !getTimerNotificationsEnabled() ||
    getNotificationCapability() !== 'granted' ||
    !('serviceWorker' in navigator)
  ) return

  try {
    const registration = await navigator.serviceWorker.ready
    if (!sessions.length) {
      await closeTimerNotification(registration)
      return
    }

    const running = sessions.filter((session) => session.status === 'running')
    const visible = running.length ? running : sessions
    const names = visible.slice(0, 3).map((session) => session.taskName.trim()).filter(Boolean)
    const more = visible.length > names.length ? ` 等 ${visible.length} 项` : ''
    const title = running.length
      ? running.length === 1 ? `正在计时 · ${names[0]}` : `${running.length} 项正在计时`
      : sessions.length === 1 ? `计时已暂停 · ${names[0]}` : `${sessions.length} 项计时已暂停`
    const body = running.length === 1
      ? '锁屏后仍会继续计时，点此返回计时器。'
      : `${names.join('、')}${more} · 点此管理计时器。`
    const base = import.meta.env.BASE_URL

    await registration.showNotification(title, {
      body,
      tag: TIMER_NOTIFICATION_TAG,
      icon: `${base}pwa-192.png`,
      badge: `${base}pwa-192.png`,
      data: { url: `${base}#/?timer=open` },
    })
  } catch {
    // Notifications are an enhancement; timer state must remain unaffected.
  }
}

export function isStandaloneApp(): boolean {
  if (typeof window === 'undefined') return false
  const iosNavigator = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || iosNavigator.standalone === true
}

export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export function supportsPersistentStorage(): boolean {
  return typeof navigator !== 'undefined' && Boolean(navigator.storage?.persist)
}

export async function getPersistentStorageState(): Promise<boolean | null> {
  if (!navigator.storage?.persisted) return null
  try {
    return await navigator.storage.persisted()
  } catch {
    return null
  }
}

export async function requestPersistentStorage(): Promise<boolean | null> {
  if (!navigator.storage?.persist) return null
  try {
    return await navigator.storage.persist()
  } catch {
    return false
  }
}
