import { useMemo, useState } from 'react'
import dayjs from 'dayjs'
import type { DailyRecord } from '../../types'
import { getTotalMinutes } from '../../lib/stats'
import { today } from '../../lib/dateUtils'
import { colors } from '../../theme/colors'

interface MonthCalendarGridProps {
  records: DailyRecord[]
  selectedDate?: string | null
  onDayClick: (date: string) => void
}

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']

interface CalendarCell {
  date: string | null
  day: number | null
}

function buildMonthGrid(year: number, month: number): CalendarCell[] {
  const first = dayjs().year(year).month(month).date(1)
  const offset = (first.day() + 6) % 7
  const daysInMonth = first.daysInMonth()
  const cells: CalendarCell[] = []

  for (let i = 0; i < offset; i++) cells.push({ date: null, day: null })
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: first.date(d).format('YYYY-MM-DD'), day: d })
  }
  while (cells.length % 7 !== 0) cells.push({ date: null, day: null })
  return cells
}

/** 米白 → 陶土色渐变 */
function heatCellColor(minutes: number, maxMinutes: number): { bg: string; text: string } {
  if (minutes <= 0) {
    return { bg: '#F0EDE9', text: colors.stoneLight }
  }
  const ratio = maxMinutes > 0 ? Math.min(minutes / maxMinutes, 1) : 1
  const r = Math.round(250 + (224 - 250) * ratio)
  const g = Math.round(247 + (122 - 247) * ratio)
  const b = Math.round(242 + (95 - 242) * ratio)
  return {
    bg: `rgb(${r}, ${g}, ${b})`,
    text: ratio > 0.55 ? '#FFFFFF' : colors.stone,
  }
}

export function MonthCalendarGrid({ records, selectedDate, onDayClick }: MonthCalendarGridProps) {
  const now = dayjs()
  const [viewYear, setViewYear] = useState(now.year())
  const [viewMonth, setViewMonth] = useState(now.month())

  const recordMap = useMemo(() => new Map(records.map((r) => [r.date, r])), [records])

  const cells = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth])

  const monthMaxMinutes = useMemo(() => {
    let max = 0
    for (const cell of cells) {
      if (!cell.date) continue
      const record = recordMap.get(cell.date)
      if (record) max = Math.max(max, getTotalMinutes(record))
    }
    return max || 1
  }, [cells, recordMap])

  const todayStr = today()

  const shiftMonth = (delta: number) => {
    const next = dayjs().year(viewYear).month(viewMonth).add(delta, 'month')
    setViewYear(next.year())
    setViewMonth(next.month())
  }

  const handleCellClick = (date: string) => {
    if (date > todayStr) return
    onDayClick(date)
  }

  return (
    <div className="w-full">
      {/* 月份导航 */}
      <div className="mb-4 flex items-center justify-between rounded-xl bg-cream px-1 py-0.5">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          aria-label="上一月"
          className="flex h-11 w-11 items-center justify-center rounded-xl text-xl text-stone-800 transition-colors active:bg-white"
        >
          ‹
        </button>
        <h3 className="text-[15px] font-semibold text-stone-800">
          {viewYear}年{viewMonth + 1}月
        </h3>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          aria-label="下一月"
          className="flex h-11 w-11 items-center justify-center rounded-xl text-xl text-stone-800 transition-colors active:bg-white"
        >
          ›
        </button>
      </div>

      {/* 星期标题 */}
      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-center text-xs font-medium text-stone-light"
          >
            {label}
          </div>
        ))}
      </div>

      {/* 日期网格 */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, idx) => {
          if (!cell.date || cell.day === null) {
            return <div key={`empty-${idx}`} className="aspect-square" />
          }

          const record = recordMap.get(cell.date)
          const minutes = record ? getTotalMinutes(record) : 0
          const isFuture = cell.date > todayStr
          const { bg, text } = heatCellColor(minutes, monthMaxMinutes)
          const isToday = cell.date === todayStr
          const isSelected = cell.date === selectedDate

          return (
            <button
              key={cell.date}
              type="button"
              disabled={isFuture}
              onClick={() => handleCellClick(cell.date!)}
              className={`relative flex aspect-square items-center justify-center rounded-[10px] text-sm font-medium disabled:cursor-default disabled:opacity-35 ${
                isToday ? 'ring-2 ring-terracotta ring-offset-1' : ''
              } ${isSelected ? 'ring-2 ring-stone-800 ring-offset-1' : ''}`}
              style={{ backgroundColor: bg, color: text }}
            >
              {cell.day}
            </button>
          )
        })}
      </div>

      {/* 图例 */}
      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-stone-light">
        <span>少</span>
        <div
          className="h-2.5 flex-1 max-w-[120px] rounded-full"
          style={{
            background: `linear-gradient(to right, #F0EDE9, ${colors.terracotta})`,
          }}
        />
        <span>多</span>
      </div>
    </div>
  )
}
