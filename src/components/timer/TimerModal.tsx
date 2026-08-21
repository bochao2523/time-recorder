import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { useTimer } from '../../context/TimerContext'
import { SessionTimer } from './SessionTimer'

export function TimerModal() {
  const { modalOpen, closeModal, sessions } = useTimer()
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const lastFocusedRef = useRef<HTMLElement | null>(null)

  useBodyScrollLock(modalOpen)

  useEffect(() => {
    if (!modalOpen) return
    const appRoot = document.getElementById('root')
    const previousAriaHidden = appRoot?.getAttribute('aria-hidden')
    lastFocusedRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null

    if (appRoot) {
      appRoot.setAttribute('inert', '')
      appRoot.setAttribute('aria-hidden', 'true')
    }

    const focusFrame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus({ preventScroll: true })
    })

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeModal()
        return
      }
      if (e.key !== 'Tab' || !dialogRef.current) return

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute('hidden'))
      if (!focusable.length) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.cancelAnimationFrame(focusFrame)
      window.removeEventListener('keydown', onKey)
      if (appRoot) {
        appRoot.removeAttribute('inert')
        if (previousAriaHidden == null) appRoot.removeAttribute('aria-hidden')
        else appRoot.setAttribute('aria-hidden', previousAriaHidden)
      }
      window.requestAnimationFrame(() => {
        lastFocusedRef.current?.focus({ preventScroll: true })
      })
    }
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
        tabIndex={-1}
        className="absolute inset-0 touch-none bg-depot-deep/65"
        onClick={closeModal}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="timer-modal-title"
        data-scroll-lock-allow
        className="calico-surface relative z-10 flex max-h-[min(92svh,100%)] w-full max-w-md flex-col overflow-hidden rounded-t-[20px] border border-terracotta/30 shadow-[0_-16px_42px_rgba(8,43,34,0.28)] sm:max-h-[85svh] sm:rounded-[18px]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 justify-center pt-2 sm:hidden" aria-hidden>
          <span className="h-1 w-10 rounded-full bg-terracotta/35" />
        </div>

        <div className="flex shrink-0 items-center justify-between border-b border-dashed border-terracotta/30 px-5 pb-3 pt-2 sm:py-4">
          <div className="min-w-0 pr-2">
            <p id="timer-modal-title" className="text-base font-extrabold text-terracotta">
              {sessions.length ? `计时器 · ${sessions.length} 项` : '开始计时'}
            </p>
            <p className="mt-0.5 text-xs text-stone-light">
              {sessions.length
                ? '每项独立开始、暂停和结束 · 收起后仍会继续'
                : '每个任务都会创建自己的独立计时器'}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={closeModal}
            className="min-h-11 shrink-0 rounded-[10px] border border-terracotta/25 px-3 py-2 text-sm font-bold text-terracotta active:bg-cream-dark"
          >
            {sessions.length ? '收起' : '关闭'}
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
