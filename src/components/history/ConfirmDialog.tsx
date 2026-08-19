import { createPortal } from 'react-dom'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = '确认',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useBodyScrollLock(open)

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="关闭"
        className="absolute inset-0 touch-none bg-depot-deep/65"
        onClick={onCancel}
      />
      <div
        data-scroll-lock-allow
        className="relative z-10 w-full max-w-sm rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] shadow-xl sm:rounded-3xl"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-cream-dark sm:hidden" />
        <h3 className="text-base font-semibold text-stone-800">{title}</h3>
        <p className="mt-2 text-sm text-stone-light">{message}</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-xl bg-cream px-4 text-sm font-medium text-stone-800 active:bg-cream-dark"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-11 rounded-xl bg-terracotta px-4 text-sm font-semibold text-white active:opacity-90"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
