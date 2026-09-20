import { useEffect, useMemo, useRef, useState } from 'react'
import { useTimer } from '../../context/TimerContext'
import { useRecords } from '../../context/RecordsContext'
import { useCategories } from '../../context/useCategories'
import type { Category } from '../../types'
import { recentTaskNames } from '../../lib/categoryItems'
import {
  formatElapsed,
  getDisplayMs,
  getSessionTargets,
  MAX_ACTIVE_TIMERS,
  MAX_TIMER_MS,
  type TimerMode,
} from '../../lib/timerStorage'
import { today } from '../../lib/dateUtils'

const COUNTDOWN_PRESETS = [15, 25, 45, 60] as const
const MAX_COUNTDOWN_MINUTES = Math.floor(MAX_TIMER_MS / 60_000)

interface SessionTimerProps {
  onFinished?: () => void
}

export function SessionTimer({ onFinished }: SessionTimerProps) {
  const {
    sessions,
    now,
    start,
    pause,
    resume,
    stop,
    discard,
    pushNotice,
  } = useTimer()
  const { records } = useRecords()
  const { activeCategories, getCategory } = useCategories()
  const [showCreate, setShowCreate] = useState(() => sessions.length === 0)
  const [taskName, setTaskName] = useState('')
  const [category, setCategory] = useState<Category>(() => activeCategories[0]?.id ?? 'study')
  const [mode, setMode] = useState<TimerMode>('stopwatch')
  const [durationMinutes, setDurationMinutes] = useState(25)
  const [durationInput, setDurationInput] = useState('25')
  const [confirmDiscardId, setConfirmDiscardId] = useState<string | null>(null)
  const cancelDiscardRef = useRef<HTMLButtonElement>(null)
  const discardButtonRefs = useRef(new Map<string, HTMLButtonElement>())

  useEffect(() => {
    if (activeCategories.some((item) => item.id === category)) return
    setCategory(activeCategories[0]?.id ?? 'study')
  }, [activeCategories, category])

  useEffect(() => {
    if (!confirmDiscardId) return
    const frame = window.requestAnimationFrame(() => cancelDiscardRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [confirmDiscardId])

  useEffect(() => {
    if (sessions.length === 0) setShowCreate(true)
  }, [sessions.length])

  const categoryDefinition = getCategory(category)
  const activeTaskNames = useMemo(() => new Set(
    sessions
      .flatMap((timer) => getSessionTargets(timer))
      .filter((target) => target.category === category)
      .map((target) => target.taskName.trim().toLocaleLowerCase()),
  ), [category, sessions])
  const rememberedTaskNames = useMemo(() => recentTaskNames(records, category, undefined, 8)
    .filter((name) => (
      name.toLocaleLowerCase() !== categoryDefinition.label.toLocaleLowerCase() &&
      !activeTaskNames.has(name.toLocaleLowerCase())
    )), [activeTaskNames, category, categoryDefinition.label, records])

  const handleStart = () => {
    const definition = getCategory(category)
    const trimmedName = taskName.trim()
    const name = trimmedName || definition.label
    if (mode === 'countdown') {
      if (!Number.isInteger(durationMinutes) || durationMinutes < 1) {
        pushNotice({ message: '倒计时至少 1 分钟', type: 'error' })
        return
      }
      if (durationMinutes > MAX_COUNTDOWN_MINUTES) {
        pushNotice({ message: `倒计时最长 ${MAX_COUNTDOWN_MINUTES} 分钟`, type: 'error' })
        return
      }
    }
    const ok = start(name, category, {
      date: today(),
      mode,
      durationMinutes: mode === 'countdown' ? durationMinutes : undefined,
    })
    if (!ok) {
      pushNotice({
        message: sessions.length >= MAX_ACTIVE_TIMERS
            ? `最多同时运行 ${MAX_ACTIVE_TIMERS} 个计时器`
            : `「${name}」已经在计时`,
        type: 'error',
      })
      return
    }
    setTaskName('')
    setShowCreate(false)
  }

  const canStart = mode === 'stopwatch' || (
    Number.isInteger(durationMinutes) &&
    durationMinutes >= 1 &&
    durationMinutes <= MAX_COUNTDOWN_MINUTES
  )

  return (
    <div className="space-y-5">
      {sessions.length > 0 && (
        <section aria-labelledby="active-timers-title">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h3 id="active-timers-title" className="text-base font-extrabold text-terracotta">独立计时器</h3>
              <p className="mt-0.5 text-xs text-stone-light">每项可以分别暂停和结束</p>
            </div>
            <span className="depot-display text-sm font-extrabold tabular-nums text-terracotta">{sessions.length}/{MAX_ACTIVE_TIMERS}</span>
          </div>

          <ol className="mt-3 space-y-2.5">
            {sessions.map((timer) => {
              const definition = getCategory(timer.category)
              const isPaused = timer.status === 'paused'
              const isCountdown = timer.mode === 'countdown'
              return (
                <li key={timer.id} className="rounded-[12px] border border-terracotta/25 bg-cream p-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: isPaused ? '#a49b84' : definition.color }}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold text-terracotta">{timer.taskName}</p>
                      <p className="mt-0.5 text-[11px] text-stone-light">
                        {definition.label}{isCountdown ? ' · 倒计时' : ''}{isPaused ? ' · 已暂停' : ' · 计时中'}
                      </p>
                    </div>
                    <p className="stable-timer-slot depot-display shrink-0 text-right text-2xl font-extrabold tabular-nums text-terracotta">
                      {isCountdown ? '剩 ' : ''}{formatElapsed(getDisplayMs(timer, now))}
                    </p>
                  </div>

                  <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2 border-t border-dashed border-terracotta/20 pt-3">
                    {confirmDiscardId === timer.id ? <>
                      <button
                        ref={cancelDiscardRef}
                        type="button"
                        onClick={() => {
                          const timerId = timer.id
                          setConfirmDiscardId(null)
                          window.requestAnimationFrame(() => discardButtonRefs.current.get(timerId)?.focus())
                        }}
                        className="min-h-11 rounded-[8px] border border-terracotta/25 text-xs font-bold text-terracotta active:bg-cream-dark"
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          discard(timer.id)
                          setConfirmDiscardId(null)
                        }}
                        className="col-span-2 min-h-11 rounded-[8px] bg-red-800 text-xs font-extrabold text-white active:opacity-85"
                      >
                        确认删除，不保存
                      </button>
                    </> : <>
                      <button
                        type="button"
                        onClick={() => isPaused ? resume(timer.id) : pause(timer.id)}
                        className="min-h-11 rounded-[8px] border border-terracotta/25 text-xs font-bold text-terracotta active:bg-cream-dark"
                      >
                        {isPaused ? '继续' : '暂停'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          stop(timer.id)
                          onFinished?.()
                        }}
                        className="min-h-11 rounded-[8px] bg-terracotta text-xs font-extrabold text-calico active:opacity-85"
                      >
                        结束并保存
                      </button>
                      <button
                        ref={(element) => {
                          if (element) discardButtonRefs.current.set(timer.id, element)
                          else discardButtonRefs.current.delete(timer.id)
                        }}
                        type="button"
                        onClick={() => setConfirmDiscardId(timer.id)}
                        aria-label={`删除「${timer.taskName}」计时`}
                        className="flex h-11 w-11 items-center justify-center rounded-[8px] text-stone-light active:bg-cream-dark active:text-terracotta"
                      >
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5" /></svg>
                      </button>
                    </>}
                  </div>
                </li>
              )
            })}
          </ol>
        </section>
      )}

      {sessions.length < MAX_ACTIVE_TIMERS && !showCreate && (
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[10px] border border-dashed border-terracotta/40 bg-calico text-sm font-extrabold text-terracotta active:bg-cream-dark"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
          新建一个独立计时器
        </button>
      )}

      {showCreate && sessions.length < MAX_ACTIVE_TIMERS && (
        <section className={sessions.length ? 'border-t border-dashed border-terracotta/30 pt-5' : ''} aria-labelledby="create-timer-title">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 id="create-timer-title" className="text-base font-extrabold text-terracotta">开始新的计时</h3>
              <p className="mt-0.5 text-xs text-stone-light">不会影响已经运行的任务</p>
            </div>
            {sessions.length > 0 && (
              <button type="button" onClick={() => setShowCreate(false)} className="min-h-11 px-2 text-xs font-bold text-stone-light active:text-terracotta">收起</button>
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {([
              { id: 'stopwatch', label: '自由计时', hint: '不限时' },
              { id: 'countdown', label: '倒计时', hint: '到时独立保存' },
            ] as const).map((item) => {
              const active = mode === item.id
              const disabled = category === 'reading' && item.id === 'countdown'
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMode(item.id)}
                  disabled={disabled}
                  className={`min-h-12 rounded-[10px] border px-3 py-2 text-left disabled:cursor-not-allowed disabled:opacity-40 ${active ? 'border-terracotta bg-terracotta text-calico' : 'border-terracotta/25 bg-calico text-terracotta'}`}
                >
                  <span className="block text-sm font-bold">{item.label}</span>
                  <span className={`mt-0.5 block text-[11px] ${active ? 'text-calico/70' : 'text-stone-light'}`}>
                    {disabled ? '阅读结束后需填页码' : item.hint}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="mt-3 grid grid-cols-[7.5rem_minmax(0,1fr)] gap-2">
            <label className="relative min-w-0">
              <span className="sr-only">任务大类</span>
              <select
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value)
                  setTaskName('')
                }}
                className="min-h-12 w-full appearance-none rounded-[10px] border border-terracotta/25 bg-calico py-2 pl-3 pr-8 text-base font-bold text-terracotta focus:border-terracotta focus:bg-white focus:outline-none focus:ring-2 focus:ring-chrome-yellow/55"
              >
                {activeCategories.map((definition) => (
                  <option key={definition.id} value={definition.id}>{definition.label}</option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-terracotta" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
            </label>
            <input
              type="text"
              value={taskName}
              onChange={(event) => setTaskName(event.target.value.slice(0, 80))}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleStart()
              }}
              placeholder="具体项目（可不填）"
              aria-label="任务名称（可选）"
              className="min-h-12 min-w-0 rounded-[10px] border border-terracotta/25 bg-calico px-3 text-base placeholder:text-stone-400 focus:border-terracotta focus:bg-white focus:outline-none focus:ring-2 focus:ring-chrome-yellow/55"
            />
          </div>

          {rememberedTaskNames.length > 0 && (
            <div className="mt-3" aria-labelledby="remembered-tasks-title">
              <div className="flex items-baseline justify-between gap-3">
                <p id="remembered-tasks-title" className="text-xs font-extrabold text-terracotta">
                  常用任务
                </p>
                <p className="text-xs text-stone-light">点一下填入</p>
              </div>
              <div
                className="horizontal-scroll-region -mx-1 mt-2 flex max-w-full gap-2 overflow-x-auto overflow-y-hidden px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                aria-label={`${categoryDefinition.label}常用任务`}
              >
                {rememberedTaskNames.map((name) => {
                  const selected = taskName.trim().toLocaleLowerCase() === name.toLocaleLowerCase()
                  return (
                    <button
                      key={name}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setTaskName(name)}
                      className={`min-h-11 shrink-0 rounded-[8px] border px-3 text-sm font-bold transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-chrome-yellow/60 ${selected
                        ? 'border-depot-green bg-depot-green text-chrome-yellow'
                        : 'border-terracotta/25 bg-calico text-terracotta active:bg-cream-dark'
                      }`}
                    >
                      {name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {mode === 'countdown' && (
            <div className="mt-3">
              <p className="text-xs font-bold text-terracotta">倒计时时长</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {COUNTDOWN_PRESETS.map((minutes) => (
                  <button
                    key={minutes}
                    type="button"
                    onClick={() => {
                      setDurationMinutes(minutes)
                      setDurationInput(String(minutes))
                    }}
                    className={`min-h-11 rounded-[8px] border px-3 text-sm font-bold ${durationInput && durationMinutes === minutes ? 'border-terracotta bg-terracotta text-calico' : 'border-terracotta/25 bg-calico text-terracotta'}`}
                  >
                    {minutes} 分
                  </button>
                ))}
              </div>
              <label className="mt-2 flex items-center gap-2 text-xs font-bold text-stone-light">
                自定义
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={durationInput}
                  onChange={(event) => {
                    const digits = event.target.value.replace(/\D/g, '')
                    setDurationInput(digits)
                    setDurationMinutes(digits ? parseInt(digits, 10) : 0)
                  }}
                  className="depot-display min-h-11 w-24 rounded-[8px] border border-terracotta/25 bg-calico px-3 text-center text-base font-bold tabular-nums text-terracotta focus:border-terracotta focus:bg-white focus:outline-none"
                />
                分钟
              </label>
            </div>
          )}

          <button
            type="button"
            onClick={handleStart}
            disabled={!canStart}
            className="mt-4 min-h-12 w-full rounded-[10px] bg-chrome-yellow px-4 text-sm font-extrabold text-terracotta disabled:cursor-not-allowed disabled:opacity-40 active:bg-[#e8bf00]"
          >
            开始这个计时器
          </button>
        </section>
      )}
    </div>
  )
}
