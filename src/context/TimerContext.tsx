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
  clearActiveTimer,
  clearPendingReadingCompletion,
  elapsedMsToMinutes,
  formatSessionTargetNames,
  getDisplayMs,
  getElapsedMs,
  getSessionTargets,
  isCountdownFinished,
  isTimerExpired,
  loadActiveTimer,
  loadPendingReadingCompletion,
  MAX_TIMER_MS,
  MIN_COUNTDOWN_MS,
  normalizeTimerTargets,
  PENDING_COMPLETE_KEY,
  saveActiveTimer,
  savePendingReadingCompletion,
  type ActiveTimerSession,
  type PendingReadingCompletion,
  type TimerTarget,
  type TimerMode,
  type TimerCompletionKind,
} from '../lib/timerStorage'
import { useRecords } from './RecordsContext'

export type StopTimerResult =
  | { ok: true; minutes: number; taskName: string; category: Category; targets: TimerTarget[]; date: string }
  | { ok: false; reason: 'too_short' | 'no_session' | 'expired' }

export type TimerNotice = {
  message: string
  type: 'success' | 'error'
}

export type StartTimerOptions = {
  date?: string
  mode?: TimerMode
  /** 同一次计时包含的全部任务；每项都会获得完整时长 */
  targets?: TimerTarget[]
  /** 倒计时分钟数 */
  durationMinutes?: number
  /** 结束后进入专用收尾流程 */
  completionKind?: TimerCompletionKind
}

interface TimerContextValue {
  session: ActiveTimerSession | null
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
  pause: () => void
  resume: () => void
  stop: () => StopTimerResult
  discard: () => void
  completeReading: (startPage: number, endPage: number) => boolean
  discardReadingCompletion: () => void
}

const TimerContext = createContext<TimerContextValue | null>(null)

const EXPIRED_NOTICE: TimerNotice = {
  message: '计时超过 5 小时，已停止且未保存',
  type: 'error',
}

type PendingComplete = {
  taskName: string
  category: Category
  targets?: TimerTarget[]
  date: string
  minutes: number
  autoCountdown: boolean
}

function loadInitialSession(): {
  session: ActiveTimerSession | null
  expired: boolean
} {
  const loaded = loadActiveTimer()
  if (!loaded) return { session: null, expired: false }

  if (isTimerExpired(loaded)) {
    clearActiveTimer()
    return { session: null, expired: true }
  }

  if (isCountdownFinished(loaded)) {
    const ms = getElapsedMs(loaded)
    const minutes = elapsedMsToMinutes(ms)
    clearActiveTimer()
    if (minutes > 0) {
      const pending: PendingComplete = {
        taskName: loaded.taskName,
        category: loaded.category,
        targets: getSessionTargets(loaded),
        date: loaded.date,
        minutes,
        autoCountdown: true,
      }
      try {
        sessionStorage.setItem(PENDING_COMPLETE_KEY, JSON.stringify(pending))
      } catch {
        // ignore quota / private mode
      }
    }
    return { session: null, expired: false }
  }

  return { session: loaded, expired: false }
}

export function TimerProvider({ children }: { children: ReactNode }) {
  const { getRecordByDate, upsertRecord } = useRecords()
  const initial = useMemo(() => loadInitialSession(), [])
  const [session, setSession] = useState<ActiveTimerSession | null>(() => initial.session)
  const [now, setNow] = useState(() => Date.now())
  const [modalOpen, setModalOpen] = useState(false)
  const [notice, setNotice] = useState<TimerNotice | null>(() =>
    initial.expired ? EXPIRED_NOTICE : null,
  )
  const [pendingReadingCompletion, setPendingReadingCompletion] = useState<PendingReadingCompletion | null>(
    () => loadPendingReadingCompletion(),
  )
  const sessionRef = useRef(session)
  sessionRef.current = session
  const completingRef = useRef(false)

  const openModal = useCallback(() => setModalOpen(true), [])
  const closeModal = useCallback(() => setModalOpen(false), [])
  const clearNotice = useCallback(() => setNotice(null), [])
  const pushNotice = useCallback((next: TimerNotice) => setNotice(next), [])

  const persist = useCallback((next: ActiveTimerSession | null) => {
    sessionRef.current = next
    setSession(next)
    if (next) saveActiveTimer(next)
    else clearActiveTimer()
  }, [])

  const recordMinutes = useCallback(
    (
      targets: TimerTarget[],
      date: string,
      minutes: number,
      noticeMessage: string,
    ) => {
      const existing = getRecordByDate(date)
      const next = appendTimerTargetsToRecord(existing, date, targets, minutes)
      if (next) upsertRecord(next)
      setNotice({ message: noticeMessage, type: 'success' })
    },
    [getRecordByDate, upsertRecord],
  )

  const completionNotice = useCallback((targets: TimerTarget[], minutes: number) => {
    if (targets.length === 1) {
      return `恭喜你完成「${targets[0].taskName}」🎉 已记录 ${minutes} 分钟`
    }
    return `已为 ${targets.length} 个任务各记录 ${minutes} 分钟，共 ${targets.length * minutes} 分钟`
  }, [])

  const voidExpired = useCallback(
    (taskName?: string) => {
      persist(null)
      setModalOpen(false)
      setNotice({
        message: taskName
          ? `「${taskName}」超过 5 小时，已停止且未保存`
          : EXPIRED_NOTICE.message,
        type: 'error',
      })
    },
    [persist],
  )

  // 刷新时若倒计时已结束，补记一次（sessionStorage 防 StrictMode 双记）
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
      const pending = JSON.parse(raw) as PendingComplete
      if (!pending?.minutes) return
      const targets = normalizeTimerTargets(
        pending.targets?.length
          ? pending.targets
          : [{ taskName: pending.taskName, category: pending.category }],
      )
      if (targets.length === 0) return
      recordMinutes(
        targets,
        pending.date,
        pending.minutes,
        completionNotice(targets, pending.minutes),
      )
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅启动时处理一次
  }, [])

  // 运行中按墙钟刷新；弹层关闭时降频，减轻手机端列表滑动卡顿
  useEffect(() => {
    if (session?.status !== 'running') return

    const tick = () => setNow(Date.now())
    tick()
    const intervalMs = modalOpen ? 250 : 1000
    const id = window.setInterval(tick, intervalMs)
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
  }, [session?.status, modalOpen])

  const elapsedMs = session ? getElapsedMs(session, now) : 0
  const displayMs = session ? getDisplayMs(session, now) : 0

  // 正计时超过 5 小时自动作废
  useEffect(() => {
    if (!session || session.mode === 'countdown') return
    if (elapsedMs < MAX_TIMER_MS) return
    voidExpired(formatSessionTargetNames(session))
  }, [session, elapsedMs, voidExpired])

  // 倒计时归零：自动记入
  useEffect(() => {
    if (!session || session.mode !== 'countdown') return
    if (!isCountdownFinished(session, now)) return
    if (completingRef.current) return
    completingRef.current = true

    const ms = getElapsedMs(session, now)
    const minutes = elapsedMsToMinutes(ms)
    const targets = getSessionTargets(session)
    const { date } = session
    persist(null)
    setModalOpen(false)

    if (minutes <= 0) {
      setNotice({ message: '少于 30 秒，未保存', type: 'error' })
    } else {
      recordMinutes(
        targets,
        date,
        minutes,
        completionNotice(targets, minutes),
      )
    }
    completingRef.current = false
  }, [session, now, persist, recordMinutes, completionNotice])

  const start = useCallback(
    (taskName: string, category: Category, options: StartTimerOptions = {}) => {
      const targets = normalizeTimerTargets(
        options.targets?.length
          ? options.targets
          : [{ taskName, category }],
      )
      if (targets.length === 0 || session || pendingReadingCompletion) return false
      const primary = targets[0]

      const mode: TimerMode = options.mode ?? 'stopwatch'
      let durationMs: number | undefined

      if (mode === 'countdown') {
        const minutes = options.durationMinutes ?? 0
        durationMs = Math.round(minutes * 60_000)
        if (durationMs < MIN_COUNTDOWN_MS || durationMs > MAX_TIMER_MS) return false
      }

      persist({
        taskName: primary.taskName,
        category: primary.category,
        targets,
        date: options.date ?? today(),
        status: 'running',
        mode,
        durationMs,
        baseElapsedMs: 0,
        segmentStartedAt: Date.now(),
        completionKind: options.completionKind,
      })
      setNow(Date.now())
      return true
    },
    [persist, session, pendingReadingCompletion],
  )

  const pause = useCallback(() => {
    setSession((prev) => {
      if (!prev || prev.status !== 'running' || prev.segmentStartedAt == null) return prev
      const next: ActiveTimerSession = {
        ...prev,
        status: 'paused',
        baseElapsedMs: getElapsedMs(prev),
        segmentStartedAt: null,
      }
      if (isTimerExpired(next)) {
        clearActiveTimer()
        sessionRef.current = null
        setModalOpen(false)
        setNotice({
          message: `「${formatSessionTargetNames(prev)}」超过 5 小时，已停止且未保存`,
          type: 'error',
        })
        return null
      }
      saveActiveTimer(next)
      return next
    })
  }, [])

  const resume = useCallback(() => {
    setSession((prev) => {
      if (!prev || prev.status !== 'paused') return prev
      if (isTimerExpired(prev)) {
        clearActiveTimer()
        sessionRef.current = null
        setModalOpen(false)
        setNotice({
          message: `「${formatSessionTargetNames(prev)}」超过 5 小时，已停止且未保存`,
          type: 'error',
        })
        return null
      }
      if (isCountdownFinished(prev)) {
        // 交给完成 effect；先恢复 running 以便 tick，或直接完成
        clearActiveTimer()
        sessionRef.current = null
        const ms = getElapsedMs(prev)
        const minutes = elapsedMsToMinutes(ms)
        if (minutes > 0) {
          const targets = getSessionTargets(prev)
          const existing = getRecordByDate(prev.date)
          const record = appendTimerTargetsToRecord(
            existing,
            prev.date,
            targets,
            minutes,
          )
          if (record) upsertRecord(record)
          setNotice({
            message: completionNotice(targets, minutes),
            type: 'success',
          })
        } else {
          setNotice({ message: '少于 30 秒，未保存', type: 'error' })
        }
        setModalOpen(false)
        return null
      }
      const next: ActiveTimerSession = {
        ...prev,
        status: 'running',
        segmentStartedAt: Date.now(),
      }
      saveActiveTimer(next)
      setNow(Date.now())
      return next
    })
  }, [getRecordByDate, upsertRecord, completionNotice])

  const discard = useCallback(() => {
    persist(null)
  }, [persist])

  const stop = useCallback((): StopTimerResult => {
    const current = sessionRef.current
    if (!current) return { ok: false, reason: 'no_session' }

    const ms = getElapsedMs(current)
    const { taskName, category, date } = current
    const targets = getSessionTargets(current)

    if (current.mode !== 'countdown' && ms >= MAX_TIMER_MS) {
      voidExpired(formatSessionTargetNames(current))
      return { ok: false, reason: 'expired' }
    }

    const minutes = elapsedMsToMinutes(ms)
    persist(null)
    setModalOpen(false)

    if (current.completionKind === 'reading') {
      const pending: PendingReadingCompletion = {
        id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `reading-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        bookTitle: taskName.trim(),
        date,
        minutes,
        completedAt: new Date().toISOString(),
      }
      savePendingReadingCompletion(pending)
      setPendingReadingCompletion(pending)
    } else if (minutes > 0) {
      recordMinutes(
        targets,
        date,
        minutes,
        completionNotice(targets, minutes),
      )
    } else {
      setNotice({ message: '少于 30 秒，未保存', type: 'error' })
      return { ok: false, reason: 'too_short' }
    }
    return { ok: true, minutes, taskName, category, targets, date }
  }, [persist, recordMinutes, voidExpired, completionNotice])

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

  const value = useMemo(
    () => ({
      session,
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
    }),
    [
      session,
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
    ],
  )

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>
}

export function useTimer(): TimerContextValue {
  const ctx = useContext(TimerContext)
  if (!ctx) throw new Error('useTimer must be used within TimerProvider')
  return ctx
}
