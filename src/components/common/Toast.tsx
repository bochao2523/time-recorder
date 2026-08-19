import { useEffect } from 'react'

interface ToastProps {
  message: string
  visible: boolean
  onHide: () => void
  type?: 'success' | 'error'
}

export function Toast({ message, visible, onHide, type = 'success' }: ToastProps) {
  useEffect(() => {
    if (!visible) return
    const t = setTimeout(onHide, 2500)
    return () => clearTimeout(t)
  }, [visible, message, onHide])

  if (!visible) return null

  return (
    <div
      role="status"
      className={`fixed left-1/2 top-[calc(4.5rem+env(safe-area-inset-top,0px))] z-[60] max-w-[90vw] -translate-x-1/2 rounded-full px-4 py-2.5 text-center text-sm font-semibold shadow-lg ${
        type === 'success' ? 'bg-sage text-white' : 'bg-terracotta text-white'
      }`}
    >
      {message}
    </div>
  )
}
