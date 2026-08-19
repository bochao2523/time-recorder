import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TimeRangePicker } from '../components/common/TimeRangePicker'
import { MonthCalendarGrid } from '../components/history/MonthCalendarGrid'
import { HistoryTable } from '../components/history/HistoryTable'
import { ConfirmDialog } from '../components/history/ConfirmDialog'
import { useRecords } from '../context/RecordsContext'
import type { TimeRange } from '../types'
import {
  calcStreak,
  filterByRange,
  getDailyAverage,
  getRangeTotalMinutes,
} from '../lib/stats'
import { today } from '../lib/dateUtils'

/** 历史页统一卡片容器 */
function HistoryCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`calico-surface stitched-light rounded-[14px] p-3.5 ${className}`}>{children}</section>
  )
}

function parseStatDisplay(totalMinutes: number): { value: string; unit: string } {
  if (totalMinutes <= 0) return { value: '0', unit: '分钟' }
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h === 0) return { value: String(m), unit: '分钟' }
  if (m === 0) return { value: String(h), unit: '小时' }
  return { value: String(h), unit: `小时 ${m} 分` }
}

function HistoryStatCard({ label, value, unit, accent }: { label: string; value: string; unit: string; accent?: boolean }) {
  return (
    <div className="min-w-0 px-2 py-1 text-center">
      <p className="truncate text-[11px] font-bold text-chrome-yellow/70">{label}</p>
      <p className={`depot-display mt-1 font-extrabold tracking-tight ${accent ? 'text-chrome-yellow' : 'text-chrome-yellow'}`}>
        <span className="text-2xl">{value}</span>
      </p>
      <p className="mt-0.5 truncate text-[11px] text-chrome-yellow/70">{unit}</p>
    </div>
  )
}

export function HistoryPage() {
  const navigate = useNavigate()
  const { records, deleteRecord } = useRecords()
  const [range, setRange] = useState<TimeRange>({ preset: 'today', end: today() })
  const [deleteDate, setDeleteDate] = useState<string | null>(null)
  const [highlightDate, setHighlightDate] = useState<string | null>(null)

  const filtered = useMemo(() => filterByRange(records, range), [records, range])

  const totalMinutes = useMemo(() => getRangeTotalMinutes(records, range), [records, range])
  const dailyAvg = useMemo(() => getDailyAverage(records, range), [records, range])
  const streak = useMemo(() => calcStreak(records), [records])

  const totalStat = useMemo(() => parseStatDisplay(totalMinutes), [totalMinutes])
  const avgStat = useMemo(() => parseStatDisplay(dailyAvg), [dailyAvg])

  const handleDeleteConfirm = () => {
    if (deleteDate) {
      deleteRecord(deleteDate)
      setDeleteDate(null)
      if (highlightDate === deleteDate) setHighlightDate(null)
    }
  }

  const handleCalendarDayClick = (date: string) => {
    if (filtered.some((r) => r.date === date)) {
      setHighlightDate(date)
      return
    }
    navigate(`/?date=${date}`)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="depot-cloth stitched-panel grid grid-cols-3 divide-x divide-chrome-yellow/30 rounded-[14px] px-2 py-4 text-chrome-yellow">
        <HistoryStatCard label="总时间" value={totalStat.value} unit={totalStat.unit} accent />
        <HistoryStatCard label="日均" value={avgStat.value} unit={avgStat.unit} />
        <HistoryStatCard label="连续天数" value={String(streak)} unit="天" />
      </div>

      {/* 时间范围 */}
      <HistoryCard>
        <h2 className="mb-3 text-[15px] font-semibold text-stone-800">时间范围</h2>
        <TimeRangePicker value={range} onChange={setRange} />
      </HistoryCard>

      {/* 按月日历 */}
      <HistoryCard>
        <h2 className="mb-1 text-lg font-bold tracking-tight text-stone-800">日历</h2>
        <p className="mb-4 text-sm text-stone-light">
          点日期查看记录；没有记录的日期可以直接添加
        </p>
        <MonthCalendarGrid
          records={records}
          selectedDate={highlightDate}
          onDayClick={handleCalendarDayClick}
        />
      </HistoryCard>

      {/* 历史列表 */}
      <HistoryCard>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-stone-800">历史记录</h2>
          <span className="rounded-full bg-cream px-2.5 py-1 text-xs text-stone-light">{filtered.length} 天</span>
        </div>
        <HistoryTable
          records={filtered}
          highlightDate={highlightDate}
          onDelete={(date) => setDeleteDate(date)}
        />
      </HistoryCard>

      <ConfirmDialog
        open={deleteDate !== null}
        title="删除记录"
        message={`删除 ${deleteDate} 的记录？删除后无法恢复。`}
        confirmLabel="删除"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteDate(null)}
      />
    </div>
  )
}
