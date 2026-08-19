import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { CATEGORY_LABELS, CATEGORIES, type Category, type DailyRecord } from '../../types'
import { formatCategoryCell } from '../../lib/categoryItems'
import { formatDisplayDate } from '../../lib/dateUtils'
import { getTotalMinutes } from '../../lib/stats'
import { categoryColors } from '../../theme/colors'
import { EmptyState } from '../common/EmptyState'

interface HistoryTableProps {
  records: DailyRecord[]
  highlightDate?: string | null
  onDelete: (date: string) => void
}

function EditIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function DeleteIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

function CategoryTags({ record }: { record: DailyRecord }) {
  const tags: { key: string; category: Category; label: string; minutes: number }[] = []

  for (const cat of CATEGORIES) {
    const items = record.subItems?.[cat]?.filter((item) => item.minutes > 0)
    if (items?.length) {
      for (const item of items) {
        tags.push({
          key: `${cat}-${item.name}-${item.minutes}`,
          category: cat,
          label: item.name || CATEGORY_LABELS[cat],
          minutes: item.minutes,
        })
      }
      continue
    }
    if (record.minutes[cat] > 0) {
      tags.push({
        key: cat,
        category: cat,
        label: CATEGORY_LABELS[cat],
        minutes: record.minutes[cat],
      })
    }
  }

  if (tags.length === 0) {
    return <span className="text-sm text-stone-light">没有时间记录</span>
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag.key}
          className="inline-flex items-center gap-1 rounded-full bg-cream px-2 py-0.5 text-xs text-stone-800"
        >
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: categoryColors[tag.category] }}
          />
          {tag.label}
          <span className="text-stone-light">{tag.minutes}分</span>
        </span>
      ))}
    </div>
  )
}

function ActionButtons({ date, onDelete }: { date: string; onDelete: (date: string) => void }) {
  const navigate = useNavigate()
  return (
    <div className="flex shrink-0 flex-col gap-1">
      <button
        type="button"
        aria-label="编辑"
        onClick={() => navigate(`/?date=${date}`)}
        className="flex h-11 w-11 items-center justify-center rounded-xl text-terracotta transition-colors hover:bg-terracotta/10"
      >
        <EditIcon />
      </button>
      <button
        type="button"
        aria-label="删除"
        onClick={() => onDelete(date)}
        className="flex h-11 w-11 items-center justify-center rounded-xl text-stone-light transition-colors hover:bg-cream-dark hover:text-terracotta"
      >
        <DeleteIcon />
      </button>
    </div>
  )
}

export function HistoryTable({ records, highlightDate, onDelete }: HistoryTableProps) {
  const navigate = useNavigate()
  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date))
  const highlightRef = useRef<string | null>(null)

  useEffect(() => {
    if (!highlightDate || highlightDate === highlightRef.current) return
    highlightRef.current = highlightDate
    const timer = setTimeout(() => {
      document.getElementById(`history-row-${highlightDate}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }, 100)
    return () => clearTimeout(timer)
  }, [highlightDate, sorted])

  if (sorted.length === 0) {
    return <EmptyState message="这里还没有留下足迹" actionLabel="记下第一条" onAction={() => navigate('/')} />
  }

  return (
    <>
      {/* 桌面端表格 */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-[15px]">
          <thead>
            <tr className="border-b border-cream-dark text-left text-sm text-stone-light">
              <th className="pb-3 pr-3 font-medium">日期</th>
              {CATEGORIES.map((c) => (
                <th key={c} className="pb-3 pr-3 font-medium">
                  {CATEGORY_LABELS[c]}
                </th>
              ))}
              <th className="pb-3 pr-3 font-medium">合计</th>
              <th className="pb-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr
                key={r.date}
                id={`history-row-${r.date}`}
                className={`border-b border-cream-dark/60 transition-colors ${
                  highlightDate === r.date ? 'bg-terracotta/5' : ''
                }`}
              >
                <td className="py-3 pr-3 whitespace-nowrap">{formatDisplayDate(r.date)}</td>
                {CATEGORIES.map((c) => (
                  <td key={c} className="max-w-[140px] py-3 pr-3 text-sm">
                    <span className="line-clamp-2">{formatCategoryCell(r, c)}</span>
                  </td>
                ))}
                <td className="py-3 pr-3 font-medium">{getTotalMinutes(r)}</td>
                <td className="py-3">
                  <ActionButtons date={r.date} onDelete={onDelete} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 移动端卡片 */}
      <div className="flex flex-col gap-4 md:hidden">
        {sorted.map((r) => (
          <article
            key={r.date}
            id={`history-row-${r.date}`}
            className={`rounded-2xl border bg-white p-4 shadow-[0_4px_18px_rgba(48,44,41,0.045)] transition-colors ${
              highlightDate === r.date
                ? 'border-terracotta bg-terracotta/5 ring-1 ring-terracotta/30'
                : 'border-cream-dark'
            }`}
          >
            <div className="flex items-start gap-1">
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[15px] font-semibold text-stone-800">
                    {formatDisplayDate(r.date)}
                  </p>
                  <span className="shrink-0 text-base font-semibold text-terracotta">
                    {getTotalMinutes(r)}
                    <span className="ml-0.5 text-xs font-normal text-stone-light">分</span>
                  </span>
                </div>
                <div className="mt-2.5">
                  <CategoryTags record={r} />
                </div>
              </div>
              <ActionButtons date={r.date} onDelete={onDelete} />
            </div>
          </article>
        ))}
      </div>
    </>
  )
}
