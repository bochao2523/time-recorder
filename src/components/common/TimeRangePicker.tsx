import type { TimeRange, TimeRangePreset } from '../../types'
import { today } from '../../lib/dateUtils'

interface TimeRangePickerProps {
  value: TimeRange
  onChange: (range: TimeRange) => void
  className?: string
}

const presets: { key: TimeRangePreset; label: string }[] = [
  { key: 'today', label: '今天' },
  { key: '7d', label: '近 7 天' },
  { key: '30d', label: '近 30 天' },
  { key: 'all', label: '全部' },
  { key: 'custom', label: '自定义' },
]

export function TimeRangePicker({ value, onChange, className = '' }: TimeRangePickerProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="grid grid-cols-5 gap-1 rounded-xl bg-cream p-1">
        {presets.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() =>
              onChange({
                preset: p.key,
                start: p.key === 'custom' ? value.start : undefined,
                end: p.key === 'custom' ? value.end : today(),
              })
            }
            className={`min-h-10 rounded-lg px-1 text-[13px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/30 ${
              value.preset === p.key
                ? 'bg-white text-terracotta shadow-sm'
                : 'text-stone-light active:bg-white/70'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {value.preset === 'custom' && (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-[15px]">
          <input
            type="date"
            value={value.start ?? ''}
            onChange={(e) => onChange({ ...value, start: e.target.value })}
            className="min-h-11 min-w-0 rounded-xl border border-cream-dark bg-white px-2 focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20"
          />
          <span className="text-stone-light">至</span>
          <input
            type="date"
            value={value.end ?? today()}
            onChange={(e) => onChange({ ...value, end: e.target.value })}
            className="min-h-11 min-w-0 rounded-xl border border-cream-dark bg-white px-2 focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20"
          />
        </div>
      )}
    </div>
  )
}
