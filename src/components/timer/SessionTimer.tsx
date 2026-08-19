import { useEffect, useState } from 'react'
import { useTimer } from '../../context/TimerContext'
import { CATEGORIES, CATEGORY_LABELS, type Category } from '../../types'
import { categoryColors } from '../../theme/colors'
import {
  formatElapsed,
  MAX_TIMER_MS,
  type TimerMode,
} from '../../lib/timerStorage'
import { today } from '../../lib/dateUtils'

const COUNTDOWN_PRESETS = [15, 25, 45, 60] as const
const MAX_COUNTDOWN_MINUTES = Math.floor(MAX_TIMER_MS / 60_000)

interface SessionTimerProps {
  /** 结束后关闭弹层等 */
  onFinished?: () => void
}

export function SessionTimer({ onFinished }: SessionTimerProps) {
  const { session, displayMs, start, pause, resume, stop, discard, pushNotice } = useTimer()
  const [taskName, setTaskName] = useState('')
  const [category, setCategory] = useState<Category>('study')
  const [mode, setMode] = useState<TimerMode>('stopwatch')
  const [durationMinutes, setDurationMinutes] = useState(25)
  /** 自定义输入展示：删光时为空，不强制显示 0 */
  const [durationInput, setDurationInput] = useState('25')

  useEffect(() => {
    if (!session) return
    setTaskName('')
  }, [session])

  const handleStart = () => {
    const name = taskName.trim()
    if (!name) {
      pushNotice({ message: '先填写任务名称', type: 'error' })
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
    const ok = start(name, category, {
      date: today(),
      mode,
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
    const color = categoryColors[session.category]
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

        <h3 className="mt-2 truncate text-xl font-semibold text-stone-800">{session.taskName}</h3>
        <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm" style={{ color }}>
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
          {CATEGORY_LABELS[session.category]}
          {totalLabel && <span className="text-stone-light">· {totalLabel}</span>}
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
    !!taskName.trim() &&
    (mode === 'stopwatch' ||
      (Number.isInteger(durationMinutes) &&
        durationMinutes >= 1 &&
        durationMinutes <= MAX_COUNTDOWN_MINUTES))

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
          <div className="flex items-baseline gap-2">
            <div className="min-w-0 flex-1">
              <label htmlFor="timer-task-name" className="text-sm font-medium text-stone-800">
                任务名称
              </label>
              <input
                id="timer-task-name"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleStart()
                }}
                placeholder="做什么？例如：高等数学"
                className="mt-2 min-h-12 w-full rounded-[10px] border border-terracotta/25 bg-calico px-3 py-2.5 text-base focus:border-terracotta focus:bg-white focus:outline-none focus:ring-2 focus:ring-chrome-yellow/55"
              />
            </div>
          </div>
        </li>

        <li>
          <div className="flex items-baseline gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-stone-800">分类</p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {CATEGORIES.map((cat) => {
                  const color = categoryColors[cat]
                  const active = category === cat
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`min-h-11 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                        active ? 'text-white shadow-sm' : 'bg-cream text-stone-800 hover:bg-cream-dark'
                      }`}
                      style={active ? { backgroundColor: color } : undefined}
                    >
                      {CATEGORY_LABELS[cat]}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
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
