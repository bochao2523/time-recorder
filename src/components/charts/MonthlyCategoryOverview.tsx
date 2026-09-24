import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import dayjs from 'dayjs'
import type { Category, CategoryDefinition, DailyRecord, TimeRange } from '../../types'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import {
  aggregateByCategory,
  aggregateSubItemsByCategory,
  filterByRange,
  getTotalMinutes,
  type SubItemAggregate,
} from '../../lib/stats'
import { DATE_FORMAT, formatMinutes } from '../../lib/dateUtils'

interface MonthlyCategoryOverviewProps {
  records: DailyRecord[]
  categories: CategoryDefinition[]
}

interface MonthlyCategoryRow extends CategoryDefinition {
  minutes: number
}

function CloseIcon() {
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="m6 6 12 12M18 6 6 18" /></svg>
}

function ChevronIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m9 18 6-6-6-6" /></svg>
}

function categoryDetails(row: MonthlyCategoryRow, source: SubItemAggregate[]): SubItemAggregate[] {
  const grouped = new Map<string, number>()
  let assignedMinutes = 0

  source.forEach((item) => {
    if (item.minutes <= 0) return
    assignedMinutes += item.minutes
    const rawName = item.name.trim()
    const name = !rawName || rawName === '未命名' || rawName === row.label ? '未细分' : rawName
    grouped.set(name, (grouped.get(name) ?? 0) + item.minutes)
  })

  const unassignedMinutes = Math.max(0, row.minutes - assignedMinutes)
  if (unassignedMinutes > 0) {
    grouped.set('未细分', (grouped.get('未细分') ?? 0) + unassignedMinutes)
  }

  return Array.from(grouped.entries())
    .map(([name, minutes]) => ({ name, minutes }))
    .sort((a, b) => b.minutes - a.minutes)
}

function MonthlyCategoryDetailSheet({
  monthLabel,
  category,
  details,
  onClose,
}: {
  monthLabel: string
  category: MonthlyCategoryRow
  details: SubItemAggregate[]
  onClose: () => void
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  useBodyScrollLock(true, { inertRoot: true, hideRootFromScreenReaders: true })

  useEffect(() => {
    const frame = requestAnimationFrame(() => closeButtonRef.current?.focus({ preventScroll: true }))
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const detailTotal = details.reduce((sum, item) => sum + item.minutes, 0)

  return createPortal(
    <div
      className="reading-sheet-backdrop fixed inset-0 z-[150] flex items-end justify-center bg-depot-deep/75 sm:items-center sm:p-4"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="monthly-category-detail-title"
        data-scroll-lock-allow
        className="reading-sheet calico-surface flex max-h-[82svh] w-full max-w-md flex-col overflow-hidden rounded-t-[20px] border border-terracotta/25 shadow-[0_-16px_42px_rgba(8,43,34,0.28)] sm:rounded-[18px]"
      >
        <div className="shrink-0 px-4 pt-3 sm:px-5 sm:pt-5">
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-terracotta/25 sm:hidden" aria-hidden />
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 pt-1 sm:pt-0">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: category.color }} aria-hidden />
                <h2 id="monthly-category-detail-title" className="truncate text-xl font-extrabold text-terracotta">{category.label}</h2>
              </div>
              <p className="mt-1 text-xs text-stone-light">{monthLabel} · 小类时间明细</p>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="关闭小类时间明细"
              className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-[10px] text-terracotta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-terracotta active:bg-cream-dark"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="mt-3 flex items-end justify-between gap-4 border-y border-dashed border-terracotta/25 py-3.5">
            <div>
              <p className="text-xs font-bold text-stone-light">大类累计</p>
              <p className="depot-display mt-1 text-3xl font-extrabold leading-none tabular-nums text-terracotta">{formatMinutes(category.minutes)}</p>
            </div>
            <p className="shrink-0 text-right text-xs font-bold text-stone-light">小类<br /><span className="depot-display text-lg font-extrabold tabular-nums text-terracotta">{details.length} 项</span></p>
          </div>
        </div>

        <div
          className="scroll-region min-h-0 flex-1 overflow-y-auto px-4 sm:px-5"
          style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
        >
          {details.length > 0 ? (
            <ol className="divide-y divide-cream-dark/70">
              {details.map((item, index) => {
                const share = detailTotal > 0 ? Math.round(item.minutes / detailTotal * 100) : 0
                return (
                  <li key={`${item.name}-${index}`} className="py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <span className="min-w-0 flex-1 break-words text-sm font-extrabold leading-5 text-depot-ink">{item.name}</span>
                      <span className="shrink-0 text-sm font-extrabold tabular-nums text-terracotta">
                        {formatMinutes(item.minutes)}
                        <span className="ml-2 text-xs font-bold text-stone-light">{share}%</span>
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-[3px] bg-cream-dark/55" aria-hidden>
                      <span className="block h-full rounded-[3px]" style={{ width: `${share}%`, backgroundColor: category.color }} />
                    </div>
                  </li>
                )
              })}
            </ol>
          ) : (
            <div className="mt-4 rounded-[10px] border border-dashed border-terracotta/25 bg-cream px-4 py-7 text-center">
              <p className="text-sm font-extrabold text-terracotta">这个月还没有小类记录</p>
              <p className="mt-1 text-xs leading-5 text-stone-light">记录任务名称后，这里会按小类汇总时间。</p>
            </div>
          )}
        </div>
      </section>
    </div>,
    document.body,
  )
}

export function MonthlyCategoryOverview({ records, categories }: MonthlyCategoryOverviewProps) {
  const currentMonth = dayjs().startOf('month')
  const [monthKey, setMonthKey] = useState(() => currentMonth.format('YYYY-MM'))
  const [selectedCategoryId, setSelectedCategoryId] = useState<Category | null>(null)
  const detailTriggerRef = useRef<HTMLButtonElement | null>(null)
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
  const monthlySubItems = useMemo(
    () => aggregateSubItemsByCategory(records, range, categoryIds),
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

  const selectedCategory = rows.find((row) => row.id === selectedCategoryId) ?? null
  const selectedDetails = useMemo(
    () => selectedCategory
      ? categoryDetails(selectedCategory, monthlySubItems[selectedCategory.id] ?? [])
      : [],
    [monthlySubItems, selectedCategory],
  )
  const openDetails = useCallback((categoryId: Category, trigger: HTMLButtonElement) => {
    detailTriggerRef.current = trigger
    setSelectedCategoryId(categoryId)
  }, [])
  const closeDetails = useCallback(() => {
    setSelectedCategoryId(null)
    const trigger = detailTriggerRef.current
    detailTriggerRef.current = null
    requestAnimationFrame(() => trigger?.focus({ preventScroll: true }))
  }, [])

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
                <button
                  key={row.id}
                  type="button"
                  aria-haspopup="dialog"
                  aria-label={`查看${monthLabel}${row.label}的小类时间明细`}
                  onClick={(event) => openDetails(row.id, event.currentTarget)}
                  className="block min-h-[4.5rem] w-full rounded-[10px] px-1 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-terracotta active:bg-cream-dark/45"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2.5 text-sm font-extrabold text-depot-ink">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.color }} aria-hidden />
                      <span className="truncate">{row.label}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-right text-sm font-extrabold tabular-nums text-terracotta">
                      <span>{formatMinutes(row.minutes)} <span className="ml-1 text-xs font-bold text-stone-light">{share}%</span></span>
                      <span className="text-stone-light/75"><ChevronIcon /></span>
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-[3px] bg-cream-dark/55" aria-hidden>
                    <span className="block h-full rounded-[3px]" style={{ width: `${share}%`, backgroundColor: row.color }} />
                  </div>
                </button>
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

      {selectedCategory && (
        <MonthlyCategoryDetailSheet
          monthLabel={monthLabel}
          category={selectedCategory}
          details={selectedDetails}
          onClose={closeDetails}
        />
      )}
    </section>
  )
}
