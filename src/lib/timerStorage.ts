import { CATEGORIES, type Category } from '../types'

export const TIMER_STORAGE_KEY = 'time-tracker:active-timer'
export const PENDING_COMPLETE_KEY = 'time-tracker:pending-complete'

/** 单次计时最长 5 小时，超时自动作废 */
export const MAX_TIMER_MS = 5 * 60 * 60 * 1000

/** 倒计时最短 1 分钟 */
export const MIN_COUNTDOWN_MS = 60_000

export type TimerStatus = 'running' | 'paused'
export type TimerMode = 'stopwatch' | 'countdown'

/** 进行中的计时会话（墙钟计时，未暂停时跨刷新/切页仍继续） */
export interface ActiveTimerSession {
  taskName: string
  category: Category
  /** 记入哪一天 YYYY-MM-DD */
  date: string
  status: TimerStatus
  mode: TimerMode
  /** 倒计时总时长（毫秒）；正计时无此字段 */
  durationMs?: number
  /** 已累计的已计时毫秒（不含当前 running 段） */
  baseElapsedMs: number
  /** running 时当前段开始的 Date.now()；paused 时为 null */
  segmentStartedAt: number | null
}

function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && (CATEGORIES as readonly string[]).includes(value)
}

function isTimerMode(value: unknown): value is TimerMode {
  return value === 'stopwatch' || value === 'countdown'
}

export function getElapsedMs(session: ActiveTimerSession, now = Date.now()): number {
  let elapsed = session.baseElapsedMs
  if (session.status === 'running' && session.segmentStartedAt != null) {
    elapsed += Math.max(0, now - session.segmentStartedAt)
  }
  if (session.mode === 'countdown' && session.durationMs != null) {
    return Math.min(elapsed, session.durationMs)
  }
  return elapsed
}

export function getRemainingMs(session: ActiveTimerSession, now = Date.now()): number {
  if (session.mode !== 'countdown' || session.durationMs == null) return 0
  return Math.max(0, session.durationMs - getElapsedMs(session, now))
}

/** UI 展示用：正计时显示已过，倒计时显示剩余 */
export function getDisplayMs(session: ActiveTimerSession, now = Date.now()): number {
  if (session.mode === 'countdown') return getRemainingMs(session, now)
  return getElapsedMs(session, now)
}

export function isCountdownFinished(session: ActiveTimerSession, now = Date.now()): boolean {
  if (session.mode !== 'countdown' || session.durationMs == null) return false
  return getElapsedMs(session, now) >= session.durationMs
}

export function isTimerExpired(session: ActiveTimerSession, now = Date.now()): boolean {
  if (session.mode === 'countdown' && session.durationMs != null) {
    // 倒计时以设定时长为准，完成后由完成逻辑处理，不算作废
    return false
  }
  return getElapsedMs(session, now) >= MAX_TIMER_MS
}

/** 毫秒 → 写入用的整数分钟；不足 30 秒记 0 */
export function elapsedMsToMinutes(ms: number): number {
  if (ms < 30_000) return 0
  return Math.max(1, Math.round(ms / 60_000))
}

export function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const pad2 = (n: number) => String(n).padStart(2, '0')
  // 时/分不补前导零：1:05、0:05，而不是 01:05
  if (h > 0) return `${h}:${pad2(m)}:${pad2(s)}`
  return `${m}:${pad2(s)}`
}

export function loadActiveTimer(): ActiveTimerSession | null {
  try {
    const raw = localStorage.getItem(TIMER_STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as Record<string, unknown>
    if (
      typeof data.taskName !== 'string' ||
      !data.taskName.trim() ||
      !isCategory(data.category) ||
      typeof data.date !== 'string' ||
      (data.status !== 'running' && data.status !== 'paused') ||
      typeof data.baseElapsedMs !== 'number' ||
      data.baseElapsedMs < 0 ||
      (data.segmentStartedAt !== null && typeof data.segmentStartedAt !== 'number')
    ) {
      return null
    }

    // 兼容旧数据：无 mode 视为正计时
    const mode: TimerMode = isTimerMode(data.mode) ? data.mode : 'stopwatch'
    let durationMs: number | undefined
    if (mode === 'countdown') {
      if (typeof data.durationMs !== 'number' || data.durationMs < MIN_COUNTDOWN_MS) return null
      if (data.durationMs > MAX_TIMER_MS) return null
      durationMs = data.durationMs
    }

    if (data.status === 'running' && data.segmentStartedAt == null) return null

    const base: ActiveTimerSession = {
      taskName: data.taskName.trim(),
      category: data.category,
      date: data.date,
      status: data.status === 'paused' ? 'paused' : 'running',
      mode,
      durationMs,
      baseElapsedMs: data.baseElapsedMs,
      segmentStartedAt:
        data.status === 'paused' ? null : (data.segmentStartedAt as number | null),
    }

    return base
  } catch {
    return null
  }
}

export function saveActiveTimer(session: ActiveTimerSession): void {
  localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(session))
}

export function clearActiveTimer(): void {
  localStorage.removeItem(TIMER_STORAGE_KEY)
}
