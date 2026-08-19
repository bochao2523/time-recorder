import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { useTimer } from '../../context/TimerContext'
import { SessionTimer } from './SessionTimer'

export function TimerModal() {
  const { modalOpen, closeModal, session } = useTimer()

  useBodyScrollLock(modalOpen)

  useEffect(() => {
    if (!modalOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modalOpen, closeModal])

  if (!modalOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center"
      role="presentation"
    >
      <button
        type="button"
        aria-label="关闭计时器"
        className="absolute inset-0 touch-none bg-stone-800/50"
        onClick={closeModal}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="timer-modal-title"
        data-scroll-lock-allow
        className="relative z-10 flex max-h-[min(92dvh,100%)] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-xl sm:max-h-[85dvh] sm:rounded-3xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 justify-center pt-2 sm:hidden" aria-hidden>
          <span className="h-1 w-10 rounded-full bg-cream-dark" />
        </div>

        <div className="flex shrink-0 items-center justify-between border-b border-cream-dark px-5 pb-3 pt-2 sm:py-4">
          <div className="min-w-0 pr-2">
            <p id="timer-modal-title" className="text-base font-semibold text-stone-800">
              {session
                ? session.mode === 'countdown'
                  ? '倒计时中'
                  : '计时中'
                : '开始计时'}
            </p>
            <p className="mt-0.5 text-xs text-stone-light">
              {session
                ? '收起后仍会继续'
                : '填写任务，选择计时方式'}
            </p>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="shrink-0 rounded-xl px-3 py-2 text-sm text-stone-light active:bg-cream"
          >
            {session ? '收起' : '关闭'}
          </button>
        </div>

        <div
          data-scroll-lock-allow
          className="scroll-region min-h-0 flex-1 overflow-y-auto overscroll-none px-5 py-5"
        >
          <SessionTimer onFinished={closeModal} />
        </div>
      </div>
    </div>,
    document.body,
  )
}
