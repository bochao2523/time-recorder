import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Category } from '../types'
import { appendReadingSessionToRecord, appendTimerTargetsToRecord } from '../lib/categoryItems'
import { today } from '../lib/dateUtils'
import {
  clearActiveTimers,
  clearPendingReadingCompletion,
  createTimerId,
  elapsedMsToMinutes,
  formatSessionTargetNames,
  getDisplayMs,
  getElapsedMs,
  getSessionTargets,
  isCountdownFinished,
  isTimerExpired,
  loadActiveTimers,
  loadPendingReadingCompletion,
  MAX_ACTIVE_TIMERS,
  MAX_TIMER_MS,
  MIN_COUNTDOWN_MS,
  normalizeTimerTargets,
  PENDING_COMPLETE_KEY,
  saveActiveTimers,
  savePendingReadingCompletion,
  type ActiveTimerSession,
  type PendingReadingCompletion,
  type TimerCompletionKind,
  type TimerMode,
  type TimerTarget,
} from '../lib/timerStorage'
import { useRecords } from './RecordsContext'

export type StopTimerResult =
  | { ok: true; sessionId: string; minutes: number; taskName: string; category: Category; targets: TimerTarget[]; date: string }
  | { ok: false; reason: 'too_short' | 'no_session' | 'expired' }

export type TimerNotice = {
  message: string
  type: 'success' | 'error'
}

export type StartTimerOptions = {
  date?: string
  mode?: TimerMode
  /** 兼容旧调用；传入多项时会创建多个彼此独立的计时器。 */
  targets?: TimerTarget[]
  durationMinutes?: number
  completionKind?: TimerCompletionKind
}

interface TimerContextValue {
  sessions: ActiveTimerSession[]
  /** 第一条计时器，保留给旧组件渐进兼容。 */
  session: ActiveTimerSession | null
  now: number
  elapsedMs: number
  displayMs: number
  modalOpen: boolean
  notice: TimerNotice | null
  pendingReadingCompletion: PendingReadingCompletion | null
  openModal: () => void
  closeModal: () => void
  clearNotice: () => void
  pushNotice: (notice: TimerNotice) => void
  start: (taskName: string, category: Category, options?: StartTimerOptions) => boolean
  pause: (sessionId: string) => void
  resume: (sessionId: string) => void
  stop: (sessionId: string) => StopTimerResult
  discard: (sessionId: string) => void
  completeReading: (startPage: number, endPage: number) => boolean
  discardReadingCompletion: () => void
}

const TimerContext = createContext<TimerContextValue | null>(null)

type PendingComplete = {
  id?: string
  taskName: string
  category: Category
  targets?: TimerTarget[]
  date: string
  minutes: number
}

function queueCompletedCountdowns(entries: PendingComplete[]) {
  if (!entries.length) return
  try {
    sessionStorage.setItem(PENDING_COMPLETE_KEY, JSON.stringify(entries))
  } catch {
    // Private mode / quota errors should not block the app shell.
  }
}

function loadInitialTimers(): {
  sessions: ActiveTimerSession[]
  expiredNames: string[]
} {
  const loaded = loadActiveTimers()
  const sessions: ActiveTimerSession[] = []
  const expiredNames: string[] = []
  const completed: PendingComplete[] = []

  for (const timer of loaded) {
    if (isTimerExpired(timer)) {
      expiredNames.push(formatSessionTargetNames(timer))
      continue
    }
    if (isCountdownFinished(timer)) {
      const minutes = elapsedMsToMinutes(getElapsedMs(timer))
      if (minutes > 0) {
        completed.push({
          id: timer.id,
          taskName: timer.taskName,
          category: timer.category,
          targets: getSessionTargets(timer),
          date: timer.date,
          minutes,
        })
      }
      continue
    }
    sessions.push(timer)
  }

  if (sessions.length !== loaded.length) {
    if (sessions.length) saveActiveTimers(sessions)
    else clearActiveTimers()
  }
  queueCompletedCountdowns(completed)
  return { sessions, expiredNames }
}

export function TimerProvider({ children }: { children: ReactNode }) {
  const { getRecordByDate, upsertRecord } = useRecords()
  const initial = useMemo(() => loadInitialTimers(), [])
  const [sessions, setSessions] = useState<ActiveTimerSession[]>(() => initial.sessions)
  const [now, setNow] = useState(() => Date.now())
  const [modalOpen, setModalOpen] = useState(false)
  const [notice, setNotice] = useState<TimerNotice | null>(() => (
    initial.expiredNames.length
      ? { message: `${initial.expiredNames.join('、')} 超过 5 小时，已停止且未保存`, type: 'error' }
      : null
  ))
  const [pendingReadingCompletion, setPendingReadingCompletion] = useState<PendingReadingCompletion | null>(
    () => loadPendingReadingCompletion(),
  )
  const sessionsRef = useRef(sessions)
  sessionsRef.current = sessions
  const completingIdsRef = useRef(new Set<string>())

  const persist = useCallback((next: ActiveTimerSession[]) => {
    const capped = next.slice(0, MAX_ACTIVE_TIMERS)
    sessionsRef.current = capped
    setSessions(capped)
    if (capped.length) saveActiveTimers(capped)
    else clearActiveTimers()
  }, [])

  const updateSessions = useCallback((updater: (current: ActiveTimerSession[]) => ActiveTimerSession[]) => {
    persist(updater(sessionsRef.current))
  }, [persist])

  const openModal = useCallback(() => setModalOpen(true), [])
  const closeModal = useCallback(() => setModalOpen(false), [])
  const clearNotice = useCallback(() => setNotice(null), [])
  const pushNotice = useCallback((next: TimerNotice) => setNotice(next), [])

  const recordCompletions = useCallback((entries: PendingComplete[], noticeMessage?: string) => {
    if (!entries.length) return
    const nextByDate = new Map<string, ReturnType<typeof getRecordByDate>>()

    for (const entry of entries) {
      const targets = normalizeTimerTargets(
        entry.targets?.length
          ? entry.targets
          : [{ taskName: entry.taskName, category: entry.category }],
      )
      if (!targets.length || entry.minutes <= 0) continue
      const existing = nextByDate.has(entry.date)
        ? nextByDate.get(entry.date)
        : getRecordByDate(entry.date)
      const next = appendTimerTargetsToRecord(existing, entry.date, targets, entry.minutes)
      if (next) nextByDate.set(entry.date, next)
    }

    for (const record of nextByDate.values()) {
      if (record) upsertRecord(record)
    }
    if (noticeMessage) setNotice({ message: noticeMessage, type: 'success' })
  }, [getRecordByDate, upsertRecord])

  // 处理刷新时已完成的倒计时。sessionStorage 消费一次，避免 StrictMode 双记。
  useEffect(() => {
    let raw: string | null = null
    try {
      raw = sessionStorage.getItem(PENDING_COMPLETE_KEY)
      if (raw) sessionStorage.removeItem(PENDING_COMPLETE_KEY)
    } catch {
      return
    }
    if (!raw) return
    try {
      const parsed = JSON.parse(raw)
      const entries = (Array.isArray(parsed) ? parsed : [parsed]) as PendingComplete[]
      const valid = entries.filter((entry) => entry?.minutes > 0)
      recordCompletions(valid, valid.length === 1
        ? `「${valid[0].taskName}」倒计时完成，已记录 ${valid[0].minutes} 分钟`
        : `${valid.length} 个倒计时已分别保存`)
    } catch {
      // Ignore corrupted legacy completion data.
    }
  }, [recordCompletions])

  // 任意计时器运行时共享一个墙钟 tick；只改变文本，不改变布局。
  useEffect(() => {
    if (!sessions.some((timer) => timer.status === 'running')) return
    const tick = () => setNow(Date.now())
    tick()
    const id = window.setInterval(tick, modalOpen ? 250 : 1000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', tick)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', tick)
    }
  }, [sessions, modalOpen])

  // 各计时器独立过期或完成，不影响同批其他任务。
  useEffect(() => {
    const expired = sessions.filter((timer) => (
      timer.mode !== 'countdown' && getElapsedMs(timer, now) >= MAX_TIMER_MS
    ))
    const completed = sessions.filter((timer) => (
      timer.mode === 'countdown' && isCountdownFinished(timer, now)
    ))
    const actionable = [...expired, ...completed].filter((timer) => !completingIdsRef.current.has(timer.id))
    if (!actionable.length) return
    actionable.forEach((timer) => completingIdsRef.current.add(timer.id))

    const ids = new Set(actionable.map((timer) => timer.id))
    persist(sessions.filter((timer) => !ids.has(timer.id)))

    const completedEntries = completed
      .filter((timer) => ids.has(timer.id))
      .map((timer) => ({
        id: timer.id,
        taskName: timer.taskName,
        category: timer.category,
        targets: getSessionTargets(timer),
        date: timer.date,
        minutes: elapsedMsToMinutes(getElapsedMs(timer, now)),
      }))
      .filter((entry) => entry.minutes > 0)
    recordCompletions(completedEntries, completedEntries.length === 1
      ? `「${completedEntries[0].taskName}」倒计时完成，已记录 ${completedEntries[0].minutes} 分钟`
      : completedEntries.length > 1 ? `${completedEntries.length} 个倒计时已分别保存` : undefined)

    if (expired.length) {
      setNotice({
        message: `${expired.map((timer) => `「${timer.taskName}」`).join('、')}超过 5 小时，已停止且未保存`,
        type: 'error',
      })
    }
    actionable.forEach((timer) => completingIdsRef.current.delete(timer.id))
  }, [sessions, now, persist, recordCompletions])

  const start = useCallback((taskName: string, category: Category, options: StartTimerOptions = {}) => {
    if (pendingReadingCompletion) return false
    const targets = normalizeTimerTargets(
      options.targets?.length ? options.targets : [{ taskName, category }],
    )
    if (!targets.length || sessionsRef.current.length + targets.length > MAX_ACTIVE_TIMERS) return false

    const activeKeys = new Set(sessionsRef.current.map((timer) => `${timer.category}\u0000${timer.taskName.trim()}`))
    if (targets.some((target) => activeKeys.has(`${target.category}\u0000${target.taskName}`))) return false

    const mode = options.mode ?? 'stopwatch'
    let durationMs: number | undefined
    if (mode === 'countdown') {
      durationMs = Math.round((options.durationMinutes ?? 0) * 60_000)
      if (durationMs < MIN_COUNTDOWN_MS || durationMs > MAX_TIMER_MS) return false
    }

    const startedAt = Date.now()
    const created = targets.map((target) => ({
      id: createTimerId(),
      taskName: target.taskName,
      category: target.category,
      targets: [target],
      date: options.date ?? today(),
      status: 'running' as const,
      mode,
      durationMs,
      baseElapsedMs: 0,
      segmentStartedAt: startedAt,
      completionKind: target.category === 'reading' ? options.completionKind : undefined,
    }))
    persist([...sessionsRef.current, ...created])
    setNow(startedAt)
    return true
  }, [pendingReadingCompletion, persist])

  const pause = useCallback((sessionId: string) => {
    updateSessions((current) => current.map((timer) => {
      if (timer.id !== sessionId || timer.status !== 'running' || timer.segmentStartedAt == null) return timer
      return {
        ...timer,
        status: 'paused',
        baseElapsedMs: getElapsedMs(timer),
        segmentStartedAt: null,
      }
    }))
  }, [updateSessions])

  const resume = useCallback((sessionId: string) => {
    const current = sessionsRef.current.find((timer) => timer.id === sessionId)
    if (!current || current.status !== 'paused') return
    if (isTimerExpired(current)) {
      persist(sessionsRef.current.filter((timer) => timer.id !== sessionId))
      setNotice({ message: `「${current.taskName}」超过 5 小时，已停止且未保存`, type: 'error' })
      return
    }
    updateSessions((timers) => timers.map((timer) => timer.id === sessionId
      ? { ...timer, status: 'running', segmentStartedAt: Date.now() }
      : timer))
    setNow(Date.now())
  }, [persist, updateSessions])

  const discard = useCallback((sessionId: string) => {
    const current = sessionsRef.current.find((timer) => timer.id === sessionId)
    if (!current) return
    persist(sessionsRef.current.filter((timer) => timer.id !== sessionId))
    setNotice({ message: `已删除「${current.taskName}」计时`, type: 'error' })
  }, [persist])

  const stop = useCallback((sessionId: string): StopTimerResult => {
    const current = sessionsRef.current.find((timer) => timer.id === sessionId)
    if (!current) return { ok: false, reason: 'no_session' }

    const ms = getElapsedMs(current)
    if (current.mode !== 'countdown' && ms >= MAX_TIMER_MS) {
      persist(sessionsRef.current.filter((timer) => timer.id !== sessionId))
      setNotice({ message: `「${current.taskName}」超过 5 小时，已停止且未保存`, type: 'error' })
      return { ok: false, reason: 'expired' }
    }

    const minutes = elapsedMsToMinutes(ms)
    const targets = getSessionTargets(current)
    persist(sessionsRef.current.filter((timer) => timer.id !== sessionId))

    if (current.completionKind === 'reading') {
      const pending: PendingReadingCompletion = {
        id: createTimerId(),
        bookTitle: current.taskName.trim(),
        date: current.date,
        minutes,
        completedAt: new Date().toISOString(),
      }
      savePendingReadingCompletion(pending)
      setPendingReadingCompletion(pending)
      setModalOpen(false)
    } else if (minutes > 0) {
      recordCompletions([{
        id: current.id,
        taskName: current.taskName,
        category: current.category,
        targets,
        date: current.date,
        minutes,
      }], `已结束「${current.taskName}」，记录 ${minutes} 分钟`)
    } else {
      setNotice({ message: `「${current.taskName}」少于 30 秒，未保存`, type: 'error' })
      return { ok: false, reason: 'too_short' }
    }

    return {
      ok: true,
      sessionId,
      minutes,
      taskName: current.taskName,
      category: current.category,
      targets,
      date: current.date,
    }
  }, [persist, recordCompletions])

  const completeReading = useCallback((startPage: number, endPage: number): boolean => {
    const pending = pendingReadingCompletion
    if (!pending) return false
    if (
      !Number.isInteger(startPage) || startPage < 1 ||
      !Number.isInteger(endPage) || endPage < startPage
    ) return false

    const existing = getRecordByDate(pending.date)
    const next = appendReadingSessionToRecord(existing, pending.date, {
      id: pending.id,
      bookTitle: pending.bookTitle,
      startPage,
      endPage,
      minutes: pending.minutes,
      completedAt: pending.completedAt,
    })
    if (!next) return false
    upsertRecord(next)
    clearPendingReadingCompletion()
    setPendingReadingCompletion(null)
    setNotice({
      message: `已记录「${pending.bookTitle}」${endPage - startPage + 1} 页 · ${pending.minutes > 0 ? `${pending.minutes} 分钟` : '不足 1 分钟'}`,
      type: 'success',
    })
    return true
  }, [pendingReadingCompletion, getRecordByDate, upsertRecord])

  const discardReadingCompletion = useCallback(() => {
    clearPendingReadingCompletion()
    setPendingReadingCompletion(null)
    setNotice({ message: '本次阅读计时已删除', type: 'error' })
  }, [])

  const session = sessions[0] ?? null
  const elapsedMs = session ? getElapsedMs(session, now) : 0
  const displayMs = session ? getDisplayMs(session, now) : 0

  const value = useMemo(() => ({
    sessions,
    session,
    now,
    elapsedMs,
    displayMs,
    modalOpen,
    notice,
    pendingReadingCompletion,
    openModal,
    closeModal,
    clearNotice,
    pushNotice,
    start,
    pause,
    resume,
    stop,
    discard,
    completeReading,
    discardReadingCompletion,
  }), [
    sessions,
    session,
    now,
    elapsedMs,
    displayMs,
    modalOpen,
    notice,
    pendingReadingCompletion,
    openModal,
    closeModal,
    clearNotice,
    pushNotice,
    start,
    pause,
    resume,
    stop,
    discard,
    completeReading,
    discardReadingCompletion,
  ])

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>
}

export function useTimer(): TimerContextValue {
  const context = useContext(TimerContext)
  if (!context) throw new Error('useTimer must be used within TimerProvider')
  return context
}
