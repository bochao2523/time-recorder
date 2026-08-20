import { useEffect, useRef, useState } from 'react'
import { useTimer } from '../../context/TimerContext'
import { useCategories } from '../../context/useCategories'
import type { Category } from '../../types'
import {
  formatElapsed,
  formatSessionTargetNames,
  getSessionTargets,
  MAX_TIMER_MS,
  normalizeTimerTargets,
  type TimerTarget,
  type TimerMode,
} from '../../lib/timerStorage'
import { today } from '../../lib/dateUtils'

const COUNTDOWN_PRESETS = [15, 25, 45, 60] as const
const MAX_COUNTDOWN_MINUTES = Math.floor(MAX_TIMER_MS / 60_000)
const MAX_SIMULTANEOUS_TASKS = 8

interface TimerTargetDraft {
  id: string
  taskName: string
  category: Category
}

interface SessionTimerProps {
  /** 结束后关闭弹层等 */
  onFinished?: () => void
}

export function SessionTimer({ onFinished }: SessionTimerProps) {
  const { session, displayMs, start, pause, resume, stop, discard, pushNotice } = useTimer()
  const { activeCategories, getCategory } = useCategories()
  const nextTargetIdRef = useRef(1)
  const [draftTargets, setDraftTargets] = useState<TimerTargetDraft[]>(() => [{
    id: 'timer-target-0',
    taskName: '',
    category: activeCategories[0]?.id ?? 'study',
  }])
  const [mode, setMode] = useState<TimerMode>('stopwatch')
  const [durationMinutes, setDurationMinutes] = useState(25)
  /** 自定义输入展示：删光时为空，不强制显示 0 */
  const [durationInput, setDurationInput] = useState('25')

  useEffect(() => {
    if (!session) return
    setDraftTargets([{
      id: `timer-target-${nextTargetIdRef.current++}`,
      taskName: '',
      category: activeCategories[0]?.id ?? 'study',
    }])
  }, [session, activeCategories])

  useEffect(() => {
    const fallback = activeCategories[0]?.id ?? 'study'
    setDraftTargets((current) => {
      let changed = false
      const next = current.map((target) => {
        if (activeCategories.some((item) => item.id === target.category)) return target
        changed = true
        return { ...target, category: fallback }
      })
      return changed ? next : current
    })
  }, [activeCategories])

  const updateDraftTarget = (id: string, patch: Partial<TimerTargetDraft>) => {
    setDraftTargets((current) => current.map((target) => (
      target.id === id ? { ...target, ...patch } : target
    )))
  }

  const addDraftTarget = () => {
    setDraftTargets((current) => {
      if (current.length >= MAX_SIMULTANEOUS_TASKS) return current
      const usedCategories = new Set(current.map((target) => target.category))
      const nextCategory = activeCategories.find((item) => !usedCategories.has(item.id))?.id
        ?? activeCategories[0]?.id
        ?? 'study'
      return [...current, {
        id: `timer-target-${nextTargetIdRef.current++}`,
        taskName: '',
        category: nextCategory,
      }]
    })
  }

  const removeDraftTarget = (id: string) => {
    setDraftTargets((current) => current.length > 1
      ? current.filter((target) => target.id !== id)
      : current)
  }

  const handleStart = () => {
    const requestedTargets: TimerTarget[] = draftTargets.map((target) => ({
      category: target.category,
      taskName: target.taskName.trim() || getCategory(target.category).label,
    }))
    const targets = normalizeTimerTargets(requestedTargets)
    if (targets.length !== requestedTargets.length) {
      pushNotice({ message: '有重复任务，请修改后再开始', type: 'error' })
      return
    }
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
    const primary = targets[0]
    const ok = start(primary.taskName, primary.category, {
      date: today(),
      mode,
      targets,
      durationMinutes: mode === 'countdown' ? durationMinutes : undefined,
    })
    if (!ok) {
      pushNotice({ message: '计时未开始，请重试', type: 'error' })
    }
  }

  const handleStop = () => {
    stop()
    onFinished?.()
  }

  const handleDiscard = () => {
    discard()
    pushNotice({ message: '本次计时已删除', type: 'error' })
    onFinished?.()
  }

  if (session) {
    const targets = getSessionTargets(session)
    const isPaused = session.status === 'paused'
    const isCountdown = session.mode === 'countdown'
    const totalLabel =
      isCountdown && session.durationMs
        ? `设定 ${Math.round(session.durationMs / 60_000)} 分钟`
        : null

    return (
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-stone-light">
            {isPaused ? '已暂停' : isCountdown ? '倒计时中' : '计时中'}
          </span>
          {!isPaused && (
            <span className="inline-flex h-2 w-2 rounded-full bg-chrome-yellow" />
          )}
        </div>

        <h3 className="mt-2 text-xl font-semibold text-stone-800">
          {targets.length > 1 ? `${targets.length} 项同时计时` : formatSessionTargetNames(session)}
        </h3>
        <div className="mt-2 flex flex-wrap gap-1.5" aria-label="本次计时任务">
          {targets.map((target) => {
            const definition = getCategory(target.category)
            return (
              <span
                key={`${target.category}-${target.taskName}`}
                className="inline-flex min-h-7 items-center gap-1.5 rounded-[8px] border bg-calico px-2 py-1 text-xs font-bold text-stone-800"
                style={{ borderColor: definition.color }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: definition.color }} />
                {target.taskName}
                {target.taskName !== definition.label && (
                  <span className="font-medium text-stone-light">· {definition.label}</span>
                )}
              </span>
            )
          })}
        </div>
        <p className="mt-2 text-xs text-stone-light">
          {targets.length > 1 ? '结束后每项都会获得完整时长' : getCategory(targets[0].category).label}
          {totalLabel && ` · ${totalLabel}`}
        </p>

        <div className="mt-6 rounded-2xl bg-cream px-4 py-6 text-center">
          <p className="text-xs text-stone-light">{isCountdown ? '剩余时间' : '已计时'}</p>
          <p className="stable-timer-slot depot-display mt-1 text-5xl font-extrabold tracking-[0.04em] text-terracotta tabular-nums">
            {formatElapsed(displayMs)}
          </p>
          <p className="mt-2 text-xs text-stone-light">
            离开页面不会中断{isCountdown ? ' · 到时自动保存' : ''}
          </p>
        </div>

        <div className="mt-5 flex gap-2">
          {isPaused ? (
            <button
              type="button"
              onClick={resume}
              className="min-h-11 flex-1 rounded-xl bg-sage py-3 text-sm font-medium text-white transition-colors hover:bg-sage/90"
            >
              继续
            </button>
          ) : (
            <button
              type="button"
              onClick={pause}
              className="min-h-11 flex-1 rounded-xl border border-cream-dark bg-cream py-3 text-sm font-medium text-stone-800 transition-colors hover:bg-cream-dark"
            >
              暂停
            </button>
          )}
          <button
            type="button"
            onClick={handleStop}
            className="min-h-11 flex-1 rounded-xl bg-terracotta py-3 text-sm font-medium text-white transition-colors hover:bg-terracotta/90"
          >
            结束并保存
          </button>
        </div>
        <button
          type="button"
          onClick={handleDiscard}
          className="mt-3 min-h-11 w-full py-2 text-center text-xs text-stone-light transition-colors hover:text-stone-800"
        >
          删除本次计时
        </button>
      </div>
    )
  }

  const canStart =
    mode === 'stopwatch' ||
      (Number.isInteger(durationMinutes) &&
        durationMinutes >= 1 &&
        durationMinutes <= MAX_COUNTDOWN_MINUTES)

  return (
    <div>
      <ol className="space-y-5">
        <li>
          <div className="flex items-baseline gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-stone-800">计时方式</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(
                  [
                    { id: 'stopwatch', label: '自由计时', hint: '不限时' },
                    { id: 'countdown', label: '倒计时', hint: '设定时间' },
                  ] as const
                ).map((item) => {
                  const active = mode === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setMode(item.id)}
                      className={`min-h-11 rounded-xl px-3 py-2.5 text-left transition-colors ${
                        active
                          ? 'bg-terracotta text-white shadow-sm'
                          : 'bg-cream text-stone-800 hover:bg-cream-dark'
                      }`}
                    >
                      <span className="block text-sm font-medium">{item.label}</span>
                      <span className={`mt-0.5 block text-xs ${active ? 'text-white/80' : 'text-stone-light'}`}>
                        {item.hint}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </li>

        <li>
          <div className="flex items-end justify-between gap-3">
            <p className="text-sm font-medium text-stone-800">计时任务</p>
            <p className="text-right text-[11px] font-medium text-stone-light">
              {draftTargets.length} 项 × 完整时长
            </p>
          </div>
          <div className="mt-2 space-y-2.5">
            {draftTargets.map((target, index) => (
              <div
                key={target.id}
                className="rounded-[12px] border border-terracotta/25 bg-cream/70 p-2.5"
              >
                <div className="mb-2 flex min-h-7 items-center justify-between gap-2">
                  <p className="text-xs font-bold text-terracotta">任务 {index + 1}</p>
                  {draftTargets.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDraftTarget(target.id)}
                      aria-label={`删除任务 ${index + 1}`}
                      className="flex h-9 w-9 items-center justify-center rounded-[8px] text-stone-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chrome-yellow active:bg-cream-dark active:text-terracotta"
                    >
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5" /></svg>
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-[7.25rem_minmax(0,1fr)] gap-2">
                  <label className="relative min-w-0">
                    <span className="sr-only">任务 {index + 1} 大类</span>
                    <select
                      value={target.category}
                      onChange={(event) => updateDraftTarget(target.id, { category: event.target.value })}
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
                    value={target.taskName}
                    onChange={(event) => updateDraftTarget(target.id, { taskName: event.target.value })}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') handleStart()
                    }}
                    placeholder="具体项目（可不填）"
                    aria-label={`任务 ${index + 1} 具体项目（可选）`}
                    className="min-h-12 min-w-0 rounded-[10px] border border-terracotta/25 bg-calico px-3 py-2 text-base placeholder:text-stone-400 focus:border-terracotta focus:bg-white focus:outline-none focus:ring-2 focus:ring-chrome-yellow/55"
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addDraftTarget}
              disabled={draftTargets.length >= MAX_SIMULTANEOUS_TASKS}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[10px] border border-dashed border-terracotta/40 bg-calico px-3 py-2 text-sm font-bold text-terracotta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chrome-yellow active:bg-cream-dark disabled:cursor-not-allowed disabled:opacity-45"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
              {draftTargets.length >= MAX_SIMULTANEOUS_TASKS ? '最多同时记录 8 项' : '同时记录另一个任务'}
            </button>
          </div>
          {draftTargets.length > 1 && (
            <p className="mt-2 text-xs leading-5 text-stone-light">
              例如计时 30 分钟，{draftTargets.length} 项任务会累计 {draftTargets.length * 30} 分钟。
            </p>
          )}
        </li>

        {mode === 'countdown' && (
          <li>
            <div className="flex items-baseline gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-stone-800">时长</p>
                <p className="mt-0.5 text-xs text-stone-light">
                  到时自动保存
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {COUNTDOWN_PRESETS.map((mins) => {
                    const active = durationInput !== '' && durationMinutes === mins
                    return (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => {
                          setDurationMinutes(mins)
                          setDurationInput(String(mins))
                        }}
                        className={`min-h-11 rounded-xl px-3 py-2 text-sm transition-colors ${
                          active
                            ? 'bg-terracotta text-white'
                            : 'bg-cream text-stone-800 hover:bg-cream-dark'
                        }`}
                      >
                        {mins} 分
                      </button>
                    )
                  })}
                </div>
                <label className="mt-3 flex items-center gap-2 text-sm text-stone-light">
                  自定义
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={durationInput}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '')
                      if (digits === '') {
                        setDurationInput('')
                        setDurationMinutes(0)
                        return
                      }
                      // parseInt 去掉前导零：01 → 1
                      const n = parseInt(digits, 10)
                      setDurationMinutes(n)
                      setDurationInput(String(n))
                    }}
                    className="min-h-11 w-24 rounded-xl border border-cream-dark bg-white px-3 py-2 text-sm text-stone-800 focus:border-terracotta focus:outline-none"
                  />
                  分钟
                </label>
              </div>
            </div>
          </li>
        )}

        <li>
          <div className="flex items-baseline gap-2">
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={handleStart}
                disabled={!canStart}
                className="min-h-11 w-full rounded-xl bg-terracotta py-3 text-sm font-medium text-white transition-colors hover:bg-terracotta/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {mode === 'countdown' ? `开始 ${durationMinutes || '—'} 分钟倒计时` : '开始计时'}
              </button>
            </div>
          </div>
        </li>
      </ol>
    </div>
  )
}
