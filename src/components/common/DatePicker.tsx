interface DatePickerProps {
  value: string
  onChange: (date: string) => void
  max?: string
}

export function DatePicker({ value, onChange, max }: DatePickerProps) {
  return (
    <div className="flex w-full min-w-0 max-w-full flex-col gap-1 overflow-hidden">
      <label className="text-xs font-medium text-stone-light">日期</label>
      <div className="w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-cream-dark bg-white transition-colors focus-within:border-terracotta focus-within:ring-2 focus-within:ring-terracotta/20">
        <input
          type="date"
          value={value}
          max={max}
          onChange={(e) => onChange(e.target.value)}
          className="block min-h-11 w-full min-w-0 max-w-full border-0 bg-transparent px-3 py-2 text-base text-stone-800 outline-none ring-0"
        />
      </div>
    </div>
  )
}
