import { useTimer } from '../../context/TimerContext'
import { formatElapsed } from '../../lib/timerStorage'
import { CATEGORY_LABELS } from '../../types'
import { categoryColors } from '../../theme/colors'

/** 顶栏入口：打开计时弹层；进行中时显示当前时长 */
export function TimerHeaderButton() {
  const { session, displayMs, openModal } = useTimer()

  if (session) {
    const color = categoryColors[session.category]
    const isPaused = session.status === 'paused'
    const isCountdown = session.mode === 'countdown'

    return (
      <button
        type="button"
        onClick={openModal}
        className="flex min-h-10 max-w-[11rem] items-center gap-2 rounded-full border border-cream-dark bg-white px-3 text-left shadow-sm transition-colors active:bg-cream sm:max-w-[14rem]"
      >
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${isPaused ? 'bg-stone-light' : 'animate-pulse bg-terracotta'}`}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-medium text-stone-800">{session.taskName}</span>
          <span className="flex items-center gap-1 text-[10px] text-stone-light">
            <span className="font-mono tabular-nums text-stone-800">
              {isCountdown ? '剩 ' : ''}
              {formatElapsed(displayMs)}
            </span>
            <span style={{ color }}>· {CATEGORY_LABELS[session.category]}</span>
          </span>
        </span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={openModal}
      className="flex min-h-10 items-center gap-1.5 rounded-full bg-terracotta px-3.5 text-sm font-semibold text-white shadow-[0_5px_16px_rgba(223,104,75,0.22)] active:scale-[0.98] active:opacity-90"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 1.5M9 2h6" /></svg>
      计时
    </button>
  )
}
