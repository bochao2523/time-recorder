import { useTimer } from '../../context/TimerContext'
import { formatElapsed } from '../../lib/timerStorage'
import { CATEGORY_LABELS } from '../../types'
import { categoryColors } from '../../theme/colors'

/** 顶栏入口：打开计时弹层；进行中时显示当前时长 */
export function TimerHeaderButton({ hideIdle = false }: { hideIdle?: boolean }) {
  const { session, displayMs, openModal } = useTimer()

  if (session) {
    const color = categoryColors[session.category]
    const isPaused = session.status === 'paused'
    const isCountdown = session.mode === 'countdown'

    return (
      <button
        type="button"
        onClick={openModal}
        className="depot-cloth flex min-h-11 max-w-[11rem] items-center gap-2 rounded-[10px] border border-chrome-yellow/45 px-3 text-left active:bg-depot-deep sm:max-w-[14rem]"
      >
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${isPaused ? 'bg-calico/60' : 'bg-chrome-yellow'}`}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-bold text-chrome-yellow">{session.taskName}</span>
          <span className="flex items-center gap-1 text-[10px] text-chrome-yellow/70">
            <span className="depot-display stable-timer-slot font-bold tabular-nums text-chrome-yellow">
              {isCountdown ? '剩 ' : ''}
              {formatElapsed(displayMs)}
            </span>
            <span style={{ color: color === '#0e3a2e' ? undefined : color }}>· {CATEGORY_LABELS[session.category]}</span>
          </span>
        </span>
      </button>
    )
  }

  if (hideIdle) {
    return <span className="h-11 w-0 shrink-0" aria-hidden />
  }

  return (
    <button
      type="button"
      onClick={openModal}
      className="flex min-h-11 items-center gap-1.5 rounded-[10px] border border-terracotta bg-chrome-yellow px-3.5 text-sm font-extrabold text-terracotta shadow-[0_6px_16px_rgba(8,43,34,0.13)] active:bg-[#e8bf00]"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 1.5M9 2h6" /></svg>
      计时
    </button>
  )
}
