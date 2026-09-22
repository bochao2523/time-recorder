import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
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
import { DATE_FORMAT, today } from '../lib/dateUtils'

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
      <p className="truncate text-xs font-bold text-chrome-yellow/70">{label}</p>
      <p className={`depot-display mt-1 font-extrabold tracking-tight ${accent ? 'text-chrome-yellow' : 'text-chrome-yellow'}`}>
        <span className="text-2xl">{value}</span>
      </p>
      <p className="mt-0.5 truncate text-xs text-chrome-yellow/70">{unit}</p>
    </div>
  )
}

export function HistoryPage() {
  const navigate = useNavigate()
  const { records, deleteRecord } = useRecords()
  const [viewMonth, setViewMonth] = useState(() => dayjs().startOf('month').format(DATE_FORMAT))
  const [deleteDate, setDeleteDate] = useState<string | null>(null)
  const [highlightDate, setHighlightDate] = useState<string | null>(null)

  const range = useMemo<TimeRange>(() => {
    const month = dayjs(viewMonth)
    const monthEnd = month.endOf('month').format(DATE_FORMAT)
    return {
      preset: 'custom',
      start: month.startOf('month').format(DATE_FORMAT),
      end: monthEnd > today() ? today() : monthEnd,
    }
  }, [viewMonth])

  const filtered = useMemo(() => filterByRange(records, range), [records, range])

  const totalMinutes = useMemo(() => getRangeTotalMinutes(records, range), [records, range])
  const dailyAvg = useMemo(() => getDailyAverage(records, range), [records, range])
  const streak = useMemo(() => calcStreak(records, range.end), [records, range.end])

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
      requestAnimationFrame(() => {
        const matchingRows = Array.from(
          document.querySelectorAll<HTMLElement>('[data-history-date]'),
        )
        const visibleRow = matchingRows.find((row) => (
          row.dataset.historyDate === date && row.getClientRects().length > 0
        ))
        visibleRow?.scrollIntoView({
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
          block: 'center',
        })
      })
      return
    }
    navigate(`/?date=${date}`)
  }

  const handleMonthChange = (month: string) => {
    setViewMonth(month)
    setHighlightDate(null)
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        aria-live="polite"
        className="depot-cloth stitched-panel grid grid-cols-3 divide-x divide-chrome-yellow/30 rounded-[14px] px-2 py-4 text-chrome-yellow"
      >
        <HistoryStatCard label="本月总时间" value={totalStat.value} unit={totalStat.unit} accent />
        <HistoryStatCard label="本月日均" value={avgStat.value} unit={avgStat.unit} />
        <HistoryStatCard label="连续天数" value={String(streak)} unit="天" />
      </div>

      {/* 按月日历 */}
      <HistoryCard>
        <h2 className="mb-1 text-lg font-bold tracking-tight text-stone-800">日历</h2>
        <p className="mb-4 text-sm text-stone-light">
          切换月份查看汇总；点日期查看或添加记录
        </p>
        <MonthCalendarGrid
          records={records}
          viewMonth={viewMonth}
          selectedDate={highlightDate}
          onMonthChange={handleMonthChange}
          onDayClick={handleCalendarDayClick}
        />
      </HistoryCard>

      {/* 历史列表 */}
      <HistoryCard>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-stone-800">历史记录</h2>
          <span className="rounded-full bg-cream px-2.5 py-1 text-xs text-stone-light">
            本月 {filtered.length} 天
          </span>
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
