import type { Category } from '../types'

/** 旧版单计时器存储键，仅用于无损迁移。 */
export const TIMER_STORAGE_KEY = 'time-tracker:active-timer'
export const TIMERS_STORAGE_KEY = 'time-tracker:active-timers'
export const PENDING_COMPLETE_KEY = 'time-tracker:pending-complete'
export const PENDING_READING_COMPLETION_KEY = 'time-tracker:pending-reading-completion'

/** 单个计时器最长 5 小时，超时自动作废。 */
export const MAX_TIMER_MS = 5 * 60 * 60 * 1000
export const MIN_COUNTDOWN_MS = 60_000
export const MAX_ACTIVE_TIMERS = 8

export type TimerStatus = 'running' | 'paused'
export type TimerMode = 'stopwatch' | 'countdown'
export type TimerCompletionKind = 'reading'

export interface TimerTarget {
  taskName: string
  category: Category
}

/** 每个任务拥有一条独立会话，可分别开始、暂停和结束。 */
export interface ActiveTimerSession {
  id: string
  taskName: string
  category: Category
  /** 兼容旧版数据；新计时器始终只有一个 target。 */
  targets: TimerTarget[]
  date: string
  status: TimerStatus
  mode: TimerMode
  durationMs?: number
  baseElapsedMs: number
  segmentStartedAt: number | null
  completionKind?: TimerCompletionKind
}

export interface PendingReadingCompletion {
  id: string
  bookTitle: string
  date: string
  minutes: number
  completedAt: string
}

function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && value.trim().length > 0
}

function isTimerMode(value: unknown): value is TimerMode {
  return value === 'stopwatch' || value === 'countdown'
}

export function createTimerId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `timer-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

/** 清理并去重同一会话中的旧版 targets。 */
export function normalizeTimerTargets(targets: readonly TimerTarget[]): TimerTarget[] {
  const result: TimerTarget[] = []
  const seen = new Set<string>()

  for (const target of targets) {
    const taskName = target.taskName.trim()
    const category = target.category.trim()
    if (!taskName || !category) continue
    const key = `${category}\u0000${taskName}`
    if (seen.has(key)) continue
    seen.add(key)
    result.push({ taskName, category })
  }

  return result
}

export function getSessionTargets(session: ActiveTimerSession): TimerTarget[] {
  const targets = normalizeTimerTargets(session.targets ?? [])
  return targets.length > 0
    ? targets
    : [{ taskName: session.taskName.trim(), category: session.category }]
}

export function formatSessionTargetNames(session: ActiveTimerSession): string {
  return getSessionTargets(session).map((target) => target.taskName).join(' ＋ ')
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

export function getDisplayMs(session: ActiveTimerSession, now = Date.now()): number {
  return session.mode === 'countdown'
    ? getRemainingMs(session, now)
    : getElapsedMs(session, now)
}

export function isCountdownFinished(session: ActiveTimerSession, now = Date.now()): boolean {
  if (session.mode !== 'countdown' || session.durationMs == null) return false
  return getElapsedMs(session, now) >= session.durationMs
}

export function isTimerExpired(session: ActiveTimerSession, now = Date.now()): boolean {
  if (session.mode === 'countdown' && session.durationMs != null) return false
  return getElapsedMs(session, now) >= MAX_TIMER_MS
}

/** 毫秒 → 写入用的整数分钟；不足 30 秒记 0。 */
export function elapsedMsToMinutes(ms: number): number {
  if (ms < 30_000) return 0
  return Math.max(1, Math.round(ms / 60_000))
}

export function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSec / 3600)
  const minutes = Math.floor((totalSec % 3600) / 60)
  const seconds = totalSec % 60
  const pad2 = (value: number) => String(value).padStart(2, '0')
  return hours > 0
    ? `${hours}:${pad2(minutes)}:${pad2(seconds)}`
    : `${minutes}:${pad2(seconds)}`
}

function parseActiveTimer(raw: unknown, fallbackId: string): ActiveTimerSession | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as Record<string, unknown>
  if (
    typeof data.taskName !== 'string' || !data.taskName.trim() ||
    !isCategory(data.category) ||
    typeof data.date !== 'string' ||
    (data.status !== 'running' && data.status !== 'paused') ||
    typeof data.baseElapsedMs !== 'number' || data.baseElapsedMs < 0 ||
    (data.segmentStartedAt !== null && typeof data.segmentStartedAt !== 'number')
  ) return null

  const mode: TimerMode = isTimerMode(data.mode) ? data.mode : 'stopwatch'
  let durationMs: number | undefined
  if (mode === 'countdown') {
    if (
      typeof data.durationMs !== 'number' ||
      data.durationMs < MIN_COUNTDOWN_MS ||
      data.durationMs > MAX_TIMER_MS
    ) return null
    durationMs = data.durationMs
  }
  if (data.status === 'running' && data.segmentStartedAt == null) return null

  const rawTargets = Array.isArray(data.targets)
    ? data.targets.flatMap((target) => {
        if (!target || typeof target !== 'object') return []
        const candidate = target as Record<string, unknown>
        if (typeof candidate.taskName !== 'string' || !isCategory(candidate.category)) return []
        return [{ taskName: candidate.taskName, category: candidate.category }]
      })
    : []
  const targets = normalizeTimerTargets(
    rawTargets.length > 0
      ? rawTargets
      : [{ taskName: data.taskName.trim(), category: data.category }],
  )
  if (!targets.length) return null
  const primary = targets[0]

  return {
    id: typeof data.id === 'string' && data.id.trim() ? data.id : fallbackId,
    taskName: primary.taskName,
    category: primary.category,
    targets,
    date: data.date,
    status: data.status === 'paused' ? 'paused' : 'running',
    mode,
    durationMs,
    baseElapsedMs: data.baseElapsedMs,
    segmentStartedAt: data.status === 'paused' ? null : data.segmentStartedAt as number,
    completionKind: data.completionKind === 'reading' ? 'reading' : undefined,
  }
}

/** 将旧版“一次绑定多个任务”无损拆成多条独立会话。 */
function splitLegacyTargets(session: ActiveTimerSession): ActiveTimerSession[] {
  const targets = getSessionTargets(session)
  if (targets.length <= 1) {
    const primary = targets[0]
    return [{ ...session, taskName: primary.taskName, category: primary.category, targets: [primary] }]
  }

  return targets.map((target, index) => ({
    ...session,
    id: index === 0 ? session.id : `${session.id}-${index + 1}`,
    taskName: target.taskName,
    category: target.category,
    targets: [target],
    completionKind: target.category === 'reading' ? session.completionKind : undefined,
  }))
}

export function loadActiveTimers(): ActiveTimerSession[] {
  try {
    const currentRaw = localStorage.getItem(TIMERS_STORAGE_KEY)
    if (currentRaw) {
      const parsed = JSON.parse(currentRaw)
      if (!Array.isArray(parsed)) return []
      const sessions = parsed.flatMap((value, index) => {
        const session = parseActiveTimer(value, `timer-${index + 1}`)
        return session ? splitLegacyTargets(session) : []
      }).slice(0, MAX_ACTIVE_TIMERS)
      if (sessions.some((session, index) => session.id !== (parsed[index] as { id?: string })?.id)) {
        saveActiveTimers(sessions)
      }
      return sessions
    }

    const legacyRaw = localStorage.getItem(TIMER_STORAGE_KEY)
    if (!legacyRaw) return []
    const legacy = parseActiveTimer(JSON.parse(legacyRaw), createTimerId())
    if (!legacy) return []
    const migrated = splitLegacyTargets(legacy).slice(0, MAX_ACTIVE_TIMERS)
    saveActiveTimers(migrated)
    localStorage.removeItem(TIMER_STORAGE_KEY)
    return migrated
  } catch {
    return []
  }
}

export function saveActiveTimers(sessions: readonly ActiveTimerSession[]): void {
  localStorage.setItem(TIMERS_STORAGE_KEY, JSON.stringify(sessions))
}

export function clearActiveTimers(): void {
  localStorage.removeItem(TIMERS_STORAGE_KEY)
  localStorage.removeItem(TIMER_STORAGE_KEY)
}

/** 兼容旧调用；新代码请使用 loadActiveTimers。 */
export function loadActiveTimer(): ActiveTimerSession | null {
  return loadActiveTimers()[0] ?? null
}

export function savePendingReadingCompletion(value: PendingReadingCompletion): void {
  localStorage.setItem(PENDING_READING_COMPLETION_KEY, JSON.stringify(value))
}

export function loadPendingReadingCompletion(): PendingReadingCompletion | null {
  try {
    const raw = localStorage.getItem(PENDING_READING_COMPLETION_KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as Record<string, unknown>
    if (
      typeof value.id !== 'string' || !value.id.trim() ||
      typeof value.bookTitle !== 'string' || !value.bookTitle.trim() ||
      typeof value.date !== 'string' ||
      typeof value.minutes !== 'number' || !Number.isInteger(value.minutes) || value.minutes < 0 ||
      typeof value.completedAt !== 'string'
    ) return null
    return {
      id: value.id,
      bookTitle: value.bookTitle.trim(),
      date: value.date,
      minutes: value.minutes,
      completedAt: value.completedAt,
    }
  } catch {
    return null
  }
}

export function clearPendingReadingCompletion(): void {
  localStorage.removeItem(PENDING_READING_COMPLETION_KEY)
}
