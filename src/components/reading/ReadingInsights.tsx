import { useEffect, useState } from 'react'
import type { ReadingBookInsights } from '../../lib/readingInsights'
import { formatReadingSeconds } from '../../lib/readingInsights'
import { formatDisplayDate, formatMinutes, formatShortDate } from '../../lib/dateUtils'

interface ReadingInsightsProps {
  bookTitles: string[]
  selectedTitle: string
  onSelectTitle: (title: string) => void
  insights: ReadingBookInsights | null
  totalPages?: number
  onSaveTotalPages: (totalPages: number) => void
}

function ProgressRing({ currentPage, totalPages, percent }: { currentPage: number; totalPages?: number; percent: number | null }) {
  const radius = 49
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - (percent ?? 0) / 100)
  return (
    <div className="relative mx-auto h-36 w-36" aria-label={percent == null ? `当前读到第 ${currentPage} 页` : `阅读进度 ${Math.round(percent)}%`}>
      <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120" aria-hidden>
        <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,210,0,0.16)" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-chrome-yellow"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-chrome-yellow">
        <span className="depot-display text-4xl font-extrabold tabular-nums leading-none">{currentPage || '—'}</span>
        <span className="mt-1 text-xs font-bold text-chrome-yellow/65">{totalPages ? `/ ${totalPages} 页` : '当前页'}</span>
      </div>
    </div>
  )
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="min-w-0 px-3 py-3">
      <p className="text-xs font-bold text-stone-light">{label}</p>
      <p className="depot-display mt-1 truncate text-2xl font-extrabold tabular-nums text-terracotta">{value}</p>
      {detail && <p className="mt-0.5 truncate text-xs text-stone-light">{detail}</p>}
    </div>
  )
}

export function ReadingInsights({
  bookTitles,
  selectedTitle,
  onSelectTitle,
  insights,
  totalPages,
  onSaveTotalPages,
}: ReadingInsightsProps) {
  const [totalPagesInput, setTotalPagesInput] = useState(totalPages ? String(totalPages) : '')

  useEffect(() => {
    setTotalPagesInput(totalPages ? String(totalPages) : '')
  }, [selectedTitle, totalPages])

  if (!insights || !selectedTitle) {
    return (
      <section className="calico-surface stitched-light rounded-[14px] p-5 text-center" aria-labelledby="reading-insights-empty-title">
        <h2 id="reading-insights-empty-title" className="text-base font-extrabold text-terracotta">阅读分析会出现在这里</h2>
        <p className="mt-1 text-xs leading-5 text-stone-light">完成一次带页码的阅读计时后，就能看到书籍进度、阅读效率和打卡趋势。</p>
      </section>
    )
  }

  const validTotalPages = Number(totalPagesInput)
  const canSaveTotalPages = Number.isInteger(validTotalPages) && validTotalPages >= Math.max(1, insights.currentPage)
  const distributionMax = Math.max(...insights.hourlyMinutes, 1)
  const trendMax = Math.max(...insights.trend.map((day) => day.minutes), 1)
  const activeTrendDays = insights.trend.filter((day) => day.minutes > 0 || day.pages > 0).length
  const estimateCopy = insights.remainingPages == null
    ? '填写总页数后，可估算阅读进度与完读时间。'
    : insights.remainingPages === 0
      ? '已经读到设定的总页数。'
      : insights.estimatedDays != null && insights.estimatedMinutes != null
        ? `按当前节奏，预计还需 ${insights.estimatedDays} 天，约 ${formatMinutes(insights.estimatedMinutes)}。`
        : '继续记录几次页码和时间后，就能估算完读日期。'
  const peakCopy = insights.peakHour == null
    ? '完成带计时的阅读后，这里会显示你最常阅读的时段。'
    : `最常在 ${String(insights.peakHour).padStart(2, '0')}:00–${String((insights.peakHour + 1) % 24).padStart(2, '0')}:00 阅读，累计 ${formatMinutes(insights.hourlyMinutes[insights.peakHour])}。`

  return (
    <div className="space-y-3">
      <section className="depot-cloth stitched-panel overflow-hidden rounded-[14px] p-4 sm:p-5" aria-labelledby="book-data-title">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="book-data-title" className="text-xl font-extrabold text-chrome-yellow">书籍数据</h2>
            <p className="mt-1 text-xs text-chrome-yellow/70">按书查看真实阅读进度</p>
          </div>
          <label className="min-w-0 max-w-[55%] text-xs font-bold text-chrome-yellow/70">
            <span className="sr-only">选择分析书籍</span>
            <select
              value={selectedTitle}
              onChange={(event) => onSelectTitle(event.target.value)}
              className="min-h-11 w-full truncate rounded-[10px] border border-chrome-yellow/40 bg-depot-deep px-3 text-sm font-bold text-chrome-yellow focus:outline-none focus:ring-2 focus:ring-chrome-yellow"
            >
              {bookTitles.map((title) => <option key={title} value={title}>{title}</option>)}
            </select>
          </label>
        </div>

        <div className="mt-4 grid items-center gap-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
          <ProgressRing currentPage={insights.currentPage} totalPages={totalPages} percent={insights.progressPercent} />
          <div className="grid grid-cols-2 overflow-hidden rounded-[12px] border border-chrome-yellow/25">
            <div className="border-b border-r border-chrome-yellow/20 p-3">
              <p className="text-xs font-bold text-chrome-yellow/65">累计时间</p>
              <p className="depot-display mt-1 text-xl font-extrabold tabular-nums text-chrome-yellow">{formatMinutes(insights.totalMinutes)}</p>
            </div>
            <div className="border-b border-chrome-yellow/20 p-3">
              <p className="text-xs font-bold text-chrome-yellow/65">阅读天数</p>
              <p className="depot-display mt-1 text-xl font-extrabold tabular-nums text-chrome-yellow">{insights.readingDays} 天</p>
            </div>
            <div className="border-r border-chrome-yellow/20 p-3">
              <p className="text-xs font-bold text-chrome-yellow/65">累计页数</p>
              <p className="depot-display mt-1 text-xl font-extrabold tabular-nums text-chrome-yellow">{insights.totalPagesRead} 页</p>
            </div>
            <div className="p-3">
              <p className="text-xs font-bold text-chrome-yellow/65">开始日期</p>
              <p className="depot-display mt-1 text-xl font-extrabold tabular-nums text-chrome-yellow">{insights.firstDate ? formatShortDate(insights.firstDate) : '—'}</p>
            </div>
          </div>
        </div>

        <form
          className="mt-4 flex items-end gap-2 border-t border-dashed border-chrome-yellow/30 pt-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (canSaveTotalPages) onSaveTotalPages(validTotalPages)
          }}
        >
          <label className="min-w-0 flex-1 text-xs font-bold text-chrome-yellow/75">
            调整本书总页数
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={totalPagesInput}
              onChange={(event) => setTotalPagesInput(event.target.value.replace(/\D/g, '').slice(0, 5))}
              placeholder={insights.currentPage ? `至少 ${insights.currentPage}` : '例如 412'}
              className="depot-display mt-1 min-h-12 w-full rounded-[10px] border border-chrome-yellow/40 bg-calico px-3 text-base font-extrabold tabular-nums text-terracotta placeholder:font-sans placeholder:text-sm placeholder:font-medium placeholder:text-stone-light focus:outline-none focus:ring-2 focus:ring-chrome-yellow"
            />
          </label>
          <button type="submit" disabled={!canSaveTotalPages || validTotalPages === totalPages} className="min-h-12 shrink-0 rounded-[10px] bg-chrome-yellow px-4 text-sm font-extrabold text-terracotta disabled:cursor-not-allowed disabled:opacity-40 active:bg-[#e8bf00]">更新页数</button>
        </form>
        {insights.currentPage > 0 && totalPagesInput && !canSaveTotalPages && (
          <p className="mt-2 text-xs font-bold text-[#ffd0c7]">总页数不能小于当前第 {insights.currentPage} 页。</p>
        )}
      </section>

      <section className="calico-surface stitched-light overflow-hidden rounded-[14px]" aria-labelledby="reading-analysis-title">
        <div className="flex items-end justify-between gap-3 px-4 pb-3 pt-4">
          <div>
            <h2 id="reading-analysis-title" className="text-xl font-extrabold text-terracotta">阅读分析</h2>
            <p className="mt-1 text-xs text-stone-light">按有记录的阅读日计算</p>
          </div>
          {insights.progressPercent != null && <p className="depot-display text-2xl font-extrabold tabular-nums text-terracotta">{Math.round(insights.progressPercent)}%</p>}
        </div>
        <div className="grid grid-cols-2 border-t border-terracotta/20 [&>*:nth-child(odd)]:border-r [&>*:nth-child(-n+2)]:border-b [&>*]:border-terracotta/20">
          <Metric label="平均每天阅读" value={formatMinutes(Math.round(insights.averageDailyMinutes))} />
          <Metric label="平均每天进度" value={`${Math.round(insights.averageDailyPages)} 页`} />
          <Metric label="平均一页阅读" value={formatReadingSeconds(insights.secondsPerPage)} />
          <Metric label="最长连续阅读" value={`${insights.longestStreak} 天`} />
        </div>
        <p className="border-t border-dashed border-terracotta/25 px-4 py-3 text-sm font-bold leading-6 text-terracotta">{estimateCopy}</p>
      </section>

      <section className="depot-cloth stitched-panel overflow-hidden rounded-[14px] p-4 sm:p-5" aria-labelledby="reading-time-title">
        <div>
          <h2 id="reading-time-title" className="text-xl font-extrabold text-chrome-yellow">阅读时段</h2>
          <p className="mt-1 text-xs text-chrome-yellow/70">根据每次计时的完成时间估算</p>
        </div>
        <div className="mt-5 grid h-28 grid-cols-[repeat(24,minmax(0,1fr))] items-end gap-1" role="img" aria-label="24小时阅读时间分布">
          {insights.hourlyMinutes.map((minutes, hour) => (
            <div key={hour} className="flex h-full items-end rounded-sm bg-chrome-yellow/10">
              <span
                className={`block w-full rounded-sm ${hour === insights.peakHour ? 'bg-chrome-yellow' : 'bg-chrome-yellow/45'}`}
                style={{ height: minutes > 0 ? `${Math.max(8, (minutes / distributionMax) * 100)}%` : '2px' }}
                title={`${hour}:00 · ${minutes} 分钟`}
              />
            </div>
          ))}
        </div>
        <div className="depot-display mt-2 flex justify-between text-xs font-bold tabular-nums text-chrome-yellow/55" aria-hidden>
          <span>0</span><span>6</span><span>12</span><span>18</span><span>24</span>
        </div>
        <p className="mt-4 border-t border-dashed border-chrome-yellow/25 pt-3 text-sm font-bold leading-6 text-chrome-yellow">{peakCopy}</p>
      </section>

      <section className="calico-surface stitched-light rounded-[14px] p-4" aria-labelledby="reading-trend-title">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 id="reading-trend-title" className="text-xl font-extrabold text-terracotta">近 14 天打卡</h2>
            <p className="mt-1 text-xs text-stone-light">{activeTrendDays} 天有阅读 · 最长连续 {insights.longestStreak} 天</p>
          </div>
        </div>
        <div className="mt-4 grid h-24 grid-cols-[repeat(14,minmax(0,1fr))] items-end gap-1.5" role="img" aria-label="近14天阅读分钟趋势">
          {insights.trend.map((day) => (
            <div key={day.date} className="flex h-full items-end rounded-sm bg-terracotta/8">
              <span
                className="block w-full rounded-sm bg-steel"
                style={{ height: day.minutes > 0 ? `${Math.max(10, (day.minutes / trendMax) * 100)}%` : '3px' }}
                title={`${formatDisplayDate(day.date)} · ${day.minutes} 分钟 · ${day.pages} 页`}
              />
            </div>
          ))}
        </div>
        <div className="depot-display mt-2 flex justify-between text-xs font-bold tabular-nums text-stone-light">
          <span>{formatShortDate(insights.trend[0].date)}</span>
          <span>{formatShortDate(insights.trend[6].date)}</span>
          <span>{formatShortDate(insights.trend[13].date)}</span>
        </div>
      </section>
    </div>
  )
}
