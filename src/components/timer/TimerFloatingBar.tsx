import { useTimer } from '../../context/TimerContext'
import { formatElapsed, getDisplayMs } from '../../lib/timerStorage'
import { useLocation } from 'react-router-dom'

/** 弹层收起后，底部轻量条提醒计时仍在进行 */
export function TimerFloatingBar() {
  const { sessions, now, modalOpen, openModal } = useTimer()
  const { pathname } = useLocation()

  if (!sessions.length || modalOpen || pathname === '/' || pathname === '/reading') return null
  const primary = sessions[0]
  const runningCount = sessions.filter((timer) => timer.status === 'running').length

  return (
    <div
      data-timer-floating-bar
      className="fixed left-0 right-0 z-20 px-3"
      style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="depot-cloth stitched-panel mx-auto flex min-h-[4.5rem] max-w-3xl items-center gap-2 rounded-[14px] px-3 py-2.5">
        <button type="button" onClick={openModal} className="flex min-h-11 min-w-0 flex-1 flex-col justify-center text-left active:opacity-80">
          <p className="truncate text-sm font-bold text-chrome-yellow">
            {sessions.length === 1 ? primary.taskName : `${sessions.length} 个独立计时器`}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-chrome-yellow/75">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-chrome-yellow" />
            {runningCount} 项运行 · {sessions.length - runningCount} 项暂停
          </p>
        </button>
        <p className="stable-timer-slot depot-display shrink-0 text-right text-sm font-extrabold tabular-nums text-chrome-yellow">
          {primary.mode === 'countdown' ? '剩 ' : ''}{formatElapsed(getDisplayMs(primary, now))}
        </p>
        <button
          type="button"
          onClick={openModal}
          className="min-h-11 shrink-0 rounded-[8px] bg-calico px-2.5 py-2 text-xs font-bold text-terracotta active:bg-cream-dark"
        >
          管理
        </button>
      </div>
    </div>
  )
}
