import { useMemo, useState } from 'react'
import dayjs from 'dayjs'
import type { CategoryDefinition, DailyRecord, TimeRange } from '../../types'
import { aggregateByCategory, filterByRange, getTotalMinutes } from '../../lib/stats'
import { DATE_FORMAT, formatMinutes } from '../../lib/dateUtils'

interface MonthlyCategoryOverviewProps {
  records: DailyRecord[]
  categories: CategoryDefinition[]
}

export function MonthlyCategoryOverview({ records, categories }: MonthlyCategoryOverviewProps) {
  const currentMonth = dayjs().startOf('month')
  const [monthKey, setMonthKey] = useState(() => currentMonth.format('YYYY-MM'))
  const viewMonth = dayjs(`${monthKey}-01`).startOf('month')

  const earliestMonth = useMemo(() => {
    if (records.length === 0) return dayjs().startOf('month')
    const earliestDate = records.reduce(
      (earliest, record) => record.date < earliest ? record.date : earliest,
      records[0].date,
    )
    return dayjs(earliestDate).startOf('month')
  }, [records])

  const range = useMemo<TimeRange>(() => ({
    preset: 'custom',
    start: dayjs(`${monthKey}-01`).startOf('month').format(DATE_FORMAT),
    end: dayjs(`${monthKey}-01`).endOf('month').format(DATE_FORMAT),
  }), [monthKey])

  const categoryIds = useMemo(() => categories.map((category) => category.id), [categories])
  const totals = useMemo(
    () => aggregateByCategory(records, range, categoryIds),
    [categoryIds, range, records],
  )
  const monthRecords = useMemo(() => filterByRange(records, range), [range, records])
  const activeDays = useMemo(
    () => monthRecords.filter((record) => getTotalMinutes(record) > 0).length,
    [monthRecords],
  )
  const monthTotal = useMemo(
    () => categoryIds.reduce((sum, category) => sum + (totals[category] ?? 0), 0),
    [categoryIds, totals],
  )
  const rows = useMemo(() => categories
    .filter((category) => category.active || (totals[category.id] ?? 0) > 0)
    .map((category) => ({
      ...category,
      minutes: totals[category.id] ?? 0,
    }))
    .sort((a, b) => b.minutes - a.minutes), [categories, totals])

  const canGoPrevious = viewMonth.isAfter(earliestMonth, 'month')
  const canGoNext = viewMonth.isBefore(currentMonth, 'month')
  const changeMonth = (delta: number) => {
    setMonthKey(viewMonth.add(delta, 'month').format('YYYY-MM'))
  }

  const positiveRows = rows.filter((row) => row.minutes > 0)
  const monthLabel = viewMonth.format('YYYY年M月')

  return (
    <section className="calico-surface stitched-light overflow-hidden rounded-[14px] p-4 sm:p-5" aria-labelledby="monthly-overview-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 id="monthly-overview-title" className="text-base font-extrabold text-terracotta">月度投入</h2>
          <p className="mt-0.5 text-xs text-stone-light">按自然月汇总每个大类</p>
        </div>
        <div className="grid w-full shrink-0 grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center rounded-[10px] border border-terracotta/20 bg-cream sm:w-auto sm:grid-cols-[2.75rem_auto_2.75rem]">
          <button
            type="button"
            aria-label="查看上个月"
            disabled={!canGoPrevious}
            onClick={() => changeMonth(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-l-[9px] text-terracotta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-terracotta active:bg-cream-dark disabled:opacity-30"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <p className="min-w-[6.75rem] px-1 text-center text-sm font-extrabold tabular-nums text-terracotta">{monthLabel}</p>
          <button
            type="button"
            aria-label="查看下个月"
            disabled={!canGoNext}
            onClick={() => changeMonth(1)}
            className="flex h-11 w-11 items-center justify-center rounded-r-[9px] text-terracotta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-terracotta active:bg-cream-dark disabled:opacity-30"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m9 18 6-6-6-6" /></svg>
          </button>
        </div>
      </div>

      <div className="mt-5 flex items-end justify-between gap-4 border-b border-dashed border-terracotta/25 pb-4">
        <div className="min-w-0">
          <p className="text-xs font-bold text-stone-light">本月累计</p>
          <p className="depot-display mt-1 text-4xl font-extrabold leading-none tabular-nums text-terracotta">{formatMinutes(monthTotal)}</p>
        </div>
        <p className="shrink-0 pb-0.5 text-right text-xs font-bold text-stone-light">记录<br /><span className="depot-display text-lg font-extrabold tabular-nums text-terracotta">{activeDays} 天</span></p>
      </div>
      <p className="sr-only" aria-live="polite">{monthLabel}，累计 {formatMinutes(monthTotal)}，记录 {activeDays} 天</p>

      {monthTotal > 0 ? (
        <>
          <div
            className="mt-4 flex h-3 overflow-hidden rounded-[4px] bg-cream-dark/55"
            role="img"
            aria-label={`${monthLabel}分类占比：${positiveRows.map((row) => `${row.label}${Math.round(row.minutes / monthTotal * 100)}%`).join('，')}`}
          >
            {positiveRows.map((row) => (
              <span key={row.id} className="h-full border-r border-calico/80 last:border-r-0" style={{ backgroundColor: row.color, flexGrow: row.minutes }} aria-hidden />
            ))}
          </div>

          <div className="mt-3 divide-y divide-cream-dark/70">
            {rows.map((row) => {
              const share = Math.round(row.minutes / monthTotal * 100)
              return (
                <div key={row.id} className="py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2.5 text-sm font-extrabold text-depot-ink">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.color }} aria-hidden />
                      <span className="truncate">{row.label}</span>
                    </span>
                    <span className="shrink-0 text-right text-sm font-extrabold tabular-nums text-terracotta">{formatMinutes(row.minutes)} <span className="ml-1 text-xs font-bold text-stone-light">{share}%</span></span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-[3px] bg-cream-dark/55" aria-hidden>
                    <span className="block h-full rounded-[3px]" style={{ width: `${share}%`, backgroundColor: row.color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <div className="mt-4 rounded-[10px] border border-dashed border-terracotta/25 bg-cream px-4 py-6 text-center">
          <p className="text-sm font-extrabold text-terracotta">这个月还没有时间记录</p>
          <p className="mt-1 text-xs text-stone-light">{records.length > 0 ? '切换月份，或先完成一次记录' : '先完成一次记录，这里会显示月度投入'}</p>
        </div>
      )}
    </section>
  )
}
