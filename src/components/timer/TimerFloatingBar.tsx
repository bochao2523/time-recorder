import { useTimer } from '../../context/TimerContext'
import { useCategories } from '../../context/useCategories'
import { formatElapsed } from '../../lib/timerStorage'
import { useLocation } from 'react-router-dom'

/** 弹层收起后，底部轻量条提醒计时仍在进行 */
export function TimerFloatingBar() {
  const { session, displayMs, modalOpen, openModal, pause, resume, stop } = useTimer()
  const { getCategory } = useCategories()
  const { pathname } = useLocation()

  if (!session || modalOpen || pathname === '/') return null

  const isPaused = session.status === 'paused'
  const isCountdown = session.mode === 'countdown'

  return (
    <div
      data-timer-floating-bar
      className="fixed left-0 right-0 z-20 px-3"
      style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="depot-cloth stitched-panel mx-auto flex min-h-[4.5rem] max-w-3xl items-center gap-2 rounded-[14px] px-3 py-2.5">
        <button type="button" onClick={openModal} className="flex min-h-11 min-w-0 flex-1 flex-col justify-center text-left active:opacity-80">
          <p className="truncate text-sm font-bold text-chrome-yellow">{session.taskName}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-chrome-yellow/75">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-chrome-yellow" />
            {getCategory(session.category).label}
            {isCountdown ? ' · 倒计时' : ''}
            {isPaused ? ' · 已暂停' : ' · 计时中'}
          </p>
        </button>
        <p className="stable-timer-slot depot-display shrink-0 text-right text-sm font-extrabold tabular-nums text-chrome-yellow">
          {isCountdown ? '剩 ' : ''}
          {formatElapsed(displayMs)}
        </p>
        {isPaused ? (
          <button
            type="button"
            onClick={resume}
            className="min-h-11 shrink-0 rounded-[8px] bg-chrome-yellow px-2.5 py-2 text-xs font-extrabold text-terracotta active:opacity-80"
          >
            继续
          </button>
        ) : (
          <button
            type="button"
            onClick={pause}
            className="min-h-11 shrink-0 rounded-[8px] border border-chrome-yellow/60 px-2.5 py-2 text-xs font-bold text-chrome-yellow active:bg-white/10"
          >
            暂停
          </button>
        )}
        <button
          type="button"
          onClick={() => stop()}
          className="min-h-11 shrink-0 rounded-[8px] bg-calico px-2.5 py-2 text-xs font-bold text-terracotta active:bg-cream-dark"
        >
          结束
        </button>
      </div>
    </div>
  )
}
