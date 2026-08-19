import { useTimer } from '../../context/TimerContext'
import { CATEGORY_LABELS } from '../../types'
import { categoryColors } from '../../theme/colors'
import { formatElapsed } from '../../lib/timerStorage'

/** 弹层收起后，底部轻量条提醒计时仍在进行 */
export function TimerFloatingBar() {
  const { session, displayMs, modalOpen, openModal, pause, resume, stop } = useTimer()

  if (!session || modalOpen) return null

  const color = categoryColors[session.category]
  const isPaused = session.status === 'paused'
  const isCountdown = session.mode === 'countdown'

  return (
    <div
      data-timer-floating-bar
      className="fixed left-0 right-0 z-20 px-3"
      style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="mobile-solid-surface mx-auto flex max-w-3xl items-center gap-2 rounded-2xl border border-cream-dark bg-white px-3 py-2.5 shadow-md">
        <button type="button" onClick={openModal} className="min-w-0 flex-1 text-left active:opacity-80">
          <p className="truncate text-sm font-medium text-stone-800">{session.taskName}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs" style={{ color }}>
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
            {CATEGORY_LABELS[session.category]}
            {isCountdown ? ' · 倒计时' : ''}
            {isPaused ? ' · 已暂停' : ' · 计时中'}
          </p>
        </button>
        <p className="shrink-0 font-mono text-sm font-semibold tabular-nums text-stone-800">
          {isCountdown ? '剩 ' : ''}
          {formatElapsed(displayMs)}
        </p>
        {isPaused ? (
          <button
            type="button"
            onClick={resume}
            className="shrink-0 rounded-lg bg-sage px-2.5 py-2 text-xs font-medium text-white active:opacity-80"
          >
            继续
          </button>
        ) : (
          <button
            type="button"
            onClick={pause}
            className="shrink-0 rounded-lg bg-cream-dark px-2.5 py-2 text-xs font-medium text-stone-800 active:opacity-80"
          >
            暂停
          </button>
        )}
        <button
          type="button"
          onClick={() => stop()}
          className="shrink-0 rounded-lg bg-terracotta px-2.5 py-2 text-xs font-medium text-white active:opacity-80"
        >
          结束
        </button>
      </div>
    </div>
  )
}
