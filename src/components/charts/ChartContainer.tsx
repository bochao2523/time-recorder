import { useEffect, useRef, type ReactNode } from 'react'
import { EmptyState } from '../common/EmptyState'

interface ChartContainerProps {
  title: string
  isEmpty?: boolean
  emptyMessage?: string
  children: ReactNode
  height?: number
}

export function ChartContainer({
  title,
  isEmpty,
  emptyMessage,
  children,
  height = 280,
}: ChartContainerProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      window.dispatchEvent(new Event('resize'))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <section className="rounded-2xl border border-cream-dark/70 bg-white p-3.5 shadow-[0_6px_24px_rgba(48,44,41,0.05)]">
      <div className="mb-3 flex items-center gap-2">
        <span className="h-4 w-1 rounded-full bg-terracotta" />
        <h3 className="text-[15px] font-semibold text-stone-800">{title}</h3>
      </div>
      <div ref={ref} style={{ height }}>
        {isEmpty ? <EmptyState message={emptyMessage} /> : children}
      </div>
    </section>
  )
}
