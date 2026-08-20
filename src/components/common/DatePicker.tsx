import { formatDisplayDate, today } from '../../lib/dateUtils'

interface DatePickerProps {
  value: string
  onChange: (date: string) => void
  max?: string
}

export function DatePicker({ value, onChange, max }: DatePickerProps) {
  const isToday = value === today()

  return (
    <div className="relative min-h-12 min-w-0 flex-1 overflow-hidden rounded-[10px] border border-terracotta/22 bg-calico focus-within:ring-2 focus-within:ring-chrome-yellow/70">
      <div className="pointer-events-none grid min-h-12 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-2.5 text-terracotta min-[390px]:gap-3 min-[390px]:px-3" aria-hidden>
        <span className="invisible w-0 overflow-hidden whitespace-nowrap text-sm font-extrabold min-[375px]:visible min-[375px]:w-auto">{isToday ? '今天' : '日期'}</span>
        <span className="truncate text-center text-base font-extrabold">{formatDisplayDate(value)}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></svg>
      </div>
      <input
        type="date"
        value={value}
        max={max}
        aria-label="选择记录日期"
        onChange={(event) => onChange(event.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </div>
  )
}
