import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageCard } from '../components/layout/Layout'
import { TimeRangePicker } from '../components/common/TimeRangePicker'
import { EmptyState } from '../components/common/EmptyState'
import { ChartContainer } from '../components/charts/ChartContainer'
import { LineTrendChart } from '../components/charts/LineTrendChart'
import { DonutChart } from '../components/charts/DonutChart'
import { SubCategoryBarChart } from '../components/charts/SubCategoryBarChart'
import { useRecords } from '../context/RecordsContext'
import { CATEGORY_LABELS, CATEGORIES, type TimeRange } from '../types'
import {
  aggregateByCategory,
  aggregateSubItemsByCategory,
  buildChartSeries,
  calcLongestStreak,
  calcStreak,
  getDailyAverage,
  getRangeTotalMinutes,
} from '../lib/stats'
import { formatMinutes, today } from '../lib/dateUtils'
import { categoryColors } from '../theme/colors'

export function DashboardPage() {
  const navigate = useNavigate()
  const { records } = useRecords()
  const [range, setRange] = useState<TimeRange>({ preset: 'today', end: today() })

  const total = useMemo(() => getRangeTotalMinutes(records, range), [records, range])
  const dailyAvg = useMemo(() => getDailyAverage(records, range), [records, range])
  const currentStreak = useMemo(() => calcStreak(records), [records])
  const longestStreak = useMemo(() => calcLongestStreak(records), [records])
  const byCategory = useMemo(() => aggregateByCategory(records, range), [records, range])
  const chartData = useMemo(() => buildChartSeries(records, range), [records, range])
  const subItemsByCategory = useMemo(
    () => aggregateSubItemsByCategory(records, range),
    [records, range],
  )

  const hasChartData = chartData.dates.some((_, i) =>
    CATEGORIES.some((c) => chartData.series[c][i] > 0),
  )
  const categoriesWithSubItems = CATEGORIES.filter((cat) => subItemsByCategory[cat].length > 0)

  return (
    <div className="space-y-3">
      <PageCard className="bg-white/90">
        <h2 className="mb-3 text-[15px] font-semibold text-stone-800">时间范围</h2>
        <TimeRangePicker value={range} onChange={setRange} />
      </PageCard>

      <section className="overflow-hidden rounded-2xl bg-stone-800 p-4 text-white shadow-[0_12px_34px_rgba(48,44,41,0.18)]">
        <p className="text-xs font-medium text-white/60">总时间</p>
        <p className="mt-1 text-3xl font-bold tracking-tight">{formatMinutes(total)}</p>
        <div className="mt-5 grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 pt-4">
          <div className="pr-2">
            <p className="text-[10px] text-white/55">日均</p>
            <p className="mt-1 truncate text-sm font-semibold">{formatMinutes(dailyAvg)}</p>
          </div>
          <div className="px-2 text-center">
            <p className="text-[10px] text-white/55">连续天数</p>
            <p className="mt-1 text-sm font-semibold">{currentStreak} 天</p>
          </div>
          <div className="pl-2 text-right">
            <p className="text-[10px] text-white/55">最长连续</p>
            <p className="mt-1 text-sm font-semibold">{longestStreak} 天</p>
          </div>
        </div>
      </section>

      <PageCard>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-stone-800">各类时间</h2>
        </div>
        <div className="divide-y divide-cream-dark/70">
          {CATEGORIES.map((cat) => (
            <div key={cat} className="flex min-h-11 items-center justify-between gap-3 py-2">
              <span className="flex min-w-0 items-center gap-2.5 text-sm font-medium text-stone-800">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: categoryColors[cat] }} />
                {CATEGORY_LABELS[cat]}
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums" style={{ color: categoryColors[cat] }}>
                {formatMinutes(byCategory[cat])}
              </span>
            </div>
          ))}
        </div>
      </PageCard>

      {!hasChartData ? (
        <PageCard>
          <EmptyState message="这里还空空的，先完成一个小任务吧" actionLabel="开始记录" onAction={() => navigate('/')} />
        </PageCard>
      ) : <>
      {range.preset !== 'today' && (
        <ChartContainer title="时间趋势" isEmpty={!hasChartData} height={300}>
          <LineTrendChart records={records} range={range} />
        </ChartContainer>
      )}

      <ChartContainer title="时间分布" isEmpty={!hasChartData} height={300}>
        <DonutChart records={records} range={range} />
      </ChartContainer>

      {categoriesWithSubItems.length > 0 && <div>
        <h2 className="mb-3 px-1 text-[15px] font-semibold text-stone-800">任务排行</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {categoriesWithSubItems.map((cat) => (
            <ChartContainer
              key={`sub-bar-${cat}`}
              title={`${CATEGORY_LABELS[cat]} · 项目排行`}
              isEmpty={subItemsByCategory[cat].length === 0}
              emptyMessage="还没有项目记录"
              height={Math.max(180, subItemsByCategory[cat].length * 36 + 48)}
            >
              <SubCategoryBarChart category={cat} data={subItemsByCategory[cat]} />
            </ChartContainer>
          ))}
        </div>
      </div>}
      </>}
    </div>
  )
}
