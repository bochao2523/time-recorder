import { useEffect, useState } from 'react'
import type { Category, CategoryDefinition, CategorySubItem } from '../../types'
import { sumSubItemMinutes } from '../../lib/categoryItems'

interface CategoryInputProps {
  definition: CategoryDefinition
  items: CategorySubItem[]
  onChange: (items: CategorySubItem[]) => void
  /** 快捷继续计时（有任务名的行显示） */
  onQuickTimer?: (item: CategorySubItem) => void
  /** 当前正在计时的任务名（同分类下可有多个） */
  activeTaskNames?: string[]
  /** 不填写小类，直接为整个大类计时 */
  onCategoryTimer?: () => void
  /** 当前是否正在为整个大类计时 */
  categoryTimerActive?: boolean
}

const SUB_ITEM_PLACEHOLDERS: Record<string, string> = {
  study: '如数学、英语',
  meditation: '如正念、呼吸',
  exercise: '如跑步、游泳',
  reading: '如小说、技术书',
  gaming: '如主机、手游',
}

function createEmptyItem(): CategorySubItem {
  return { name: '', minutes: 0 }
}

/** 展示用：无数据时保留一行空输入，便于首次录入 */
function displayItems(items: CategorySubItem[]): CategorySubItem[] {
  return items.length > 0 ? items : [createEmptyItem()]
}

function TimerIcon({ active }: { active?: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {active ? (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </>
      ) : (
        <>
          <circle cx="12" cy="12" r="9" />
          <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
        </>
      )}
    </svg>
  )
}

function CategoryIcon({ category, label }: { category: Category; label: string }) {
  const common = {
    width: 19,
    height: 19,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  switch (category) {
    case 'study':
      return <svg {...common}><path d="m3 10 9-5 9 5-9 5-9-5Z" /><path d="M7 12.5V17c2.8 2 7.2 2 10 0v-4.5M21 10v6" /></svg>
    case 'meditation':
      return <svg {...common}><path d="M12 3c2.7 3.2 3.2 6 0 8.5C8.8 9 9.3 6.2 12 3Z" /><path d="M5 11c4 .2 6.5 2.2 7 6-3.8.3-6.3-1.7-7-6ZM19 11c-4 .2-6.5 2.2-7 6 3.8.3 6.3-1.7 7-6Z" /><path d="M5 20h14" /></svg>
    case 'exercise':
      return <svg {...common}><path d="M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12" /></svg>
    case 'reading':
      return <svg {...common}><path d="M3 5.5A3.5 3.5 0 0 1 6.5 2H11v17H6.5A3.5 3.5 0 0 0 3 22V5.5ZM21 5.5A3.5 3.5 0 0 0 17.5 2H13v17h4.5A3.5 3.5 0 0 1 21 22V5.5Z" /></svg>
    case 'gaming':
      return <svg {...common}><path d="M8.5 8h7a5.5 5.5 0 0 1 5.3 7l-1 3.3a2 2 0 0 1-3.2 1l-2.1-1.8h-5l-2.1 1.8a2 2 0 0 1-3.2-1L3.2 15a5.5 5.5 0 0 1 5.3-7Z" /><path d="M7 12v4M5 14h4M16.5 13h.01M18.5 15h.01" /></svg>
    default:
      if (/[琴乐歌唱鼓笛]/.test(label)) {
        return <svg {...common}><path d="M9 18V5l10-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="16" cy="16" r="3" /></svg>
      }
      return <svg {...common}><path d="M4 6.5h6l2 2h8v10.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6.5Z" /><path d="M4 11h16" /></svg>
  }
}

export function CategoryInput({
  definition,
  items,
  onChange,
  onQuickTimer,
  activeTaskNames = [],
  onCategoryTimer,
  categoryTimerActive = false,
}: CategoryInputProps) {
  const { id: category, label, color } = definition
  const rows = displayItems(items)
  const total = sumSubItemMinutes(items)
  const [isExpanded, setIsExpanded] = useState(false)
  /** 分钟输入草稿：删光时显示空，失焦后再提交 0，避免改数时整行被自动清掉 */
  const [minutesDraft, setMinutesDraft] = useState<Record<number, string>>({})

  useEffect(() => {
    setMinutesDraft({})
  }, [category, items.length])

  const updateItems = (next: CategorySubItem[]) => {
    onChange(next)
  }

  const updateItem = (index: number, patch: Partial<CategorySubItem>) => {
    const base = items.length > 0 ? items : [createEmptyItem()]
    const next = base.map((item, i) => (i === index ? { ...item, ...patch } : item))
    updateItems(next)
  }

  const handleMinutesChange = (index: number, raw: string) => {
    if (raw === '') {
      setMinutesDraft((prev) => ({ ...prev, [index]: '' }))
      return
    }
    if (!/^\d+$/.test(raw)) return
    const n = parseInt(raw, 10)
    setMinutesDraft((prev) => {
      if (prev[index] === undefined) return prev
      const next = { ...prev }
      delete next[index]
      return next
    })
    updateItem(index, { minutes: n })
  }

  const handleMinutesBlur = (index: number) => {
    if (minutesDraft[index] === undefined) return
    if (minutesDraft[index] === '') {
      updateItem(index, { minutes: 0 })
    }
    setMinutesDraft((prev) => {
      const next = { ...prev }
      delete next[index]
      return next
    })
  }

  const handleRemove = (index: number) => {
    const base = items.length > 0 ? items : [createEmptyItem()]
    const next = base.filter((_, i) => i !== index)
    updateItems(next.length > 0 ? next : [])
    setMinutesDraft({})
  }

  const handleAdd = () => {
    const base = items.length > 0 ? items : []
    updateItems([...base, createEmptyItem()])
  }

  return (
    <section
      className="calico-surface stitched-light w-full min-w-0 max-w-full overflow-hidden rounded-[14px] px-3.5 sm:px-4"
    >
      <div className="flex min-h-[4.5rem] items-center gap-1">
        <button
          type="button"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((expanded) => !expanded)}
          className="flex min-h-[4.5rem] min-w-0 flex-1 items-center justify-between gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-chrome-yellow"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-calico shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)]" style={{ backgroundColor: color }}>
              <CategoryIcon category={category} label={label} />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-extrabold text-terracotta">{label}</span>
              <span className="block truncate text-[11px] font-medium text-stone-light">{items.length > 0 ? `${items.length} 个项目` : '点开添加项目'}</span>
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1 text-sm text-stone-light">
            <span className={total > 0 ? 'depot-display font-extrabold text-terracotta' : 'font-semibold text-terracotta'}>
              {total > 0 ? <><span className="font-semibold text-stone-800">{total}</span> 分</> : isExpanded ? '收起' : '添加'}
            </span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={isExpanded ? 'rotate-180' : ''}
              aria-hidden
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </button>

        {onCategoryTimer && (
          <button
            type="button"
            onClick={onCategoryTimer}
            aria-label={categoryTimerActive ? `查看「${label}」计时` : `直接为「${label}」计时`}
            title={categoryTimerActive ? '查看计时' : `直接记录${label}`}
            className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center gap-0.5 rounded-[10px] border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chrome-yellow active:opacity-80 ${
              categoryTimerActive
                ? 'border-chrome-yellow bg-terracotta text-chrome-yellow'
                : 'border-terracotta/25 bg-calico text-terracotta hover:bg-terracotta hover:text-chrome-yellow'
            }`}
          >
            <TimerIcon active={categoryTimerActive} />
            <span className="text-[10px] font-extrabold leading-none">计时</span>
          </button>
        )}
      </div>

      {isExpanded && <div className="border-t border-dashed border-terracotta/30 pb-3.5 pt-3.5">
      <div className="space-y-2.5">
        {rows.map((item, index) => {
          const minutesValue =
            minutesDraft[index] !== undefined
              ? minutesDraft[index]
              : item.minutes > 0
                ? String(item.minutes)
                : ''
          const taskName = item.name.trim()
          const showQuickTimer = !!onQuickTimer && taskName.length > 0
          const isActive =
            activeTaskNames.some((activeName) => activeName.trim() === taskName)

          return (
            <div
              key={`${category}-${index}`}
              className="grid grid-cols-[minmax(0,1fr)_4.5rem_auto] items-center gap-2"
            >
              <input
                type="text"
                value={item.name}
                onChange={(e) => updateItem(index, { name: e.target.value })}
                placeholder={SUB_ITEM_PLACEHOLDERS[category] ?? `如${label}的具体项目`}
                aria-label={`${label}第 ${index + 1} 项任务名称`}
                enterKeyHint="next"
                className="min-h-12 min-w-0 rounded-[10px] border border-terracotta/25 bg-calico px-3 py-2 text-base font-medium placeholder:text-stone-400 focus:border-terracotta focus:bg-white focus:outline-none focus:ring-2 focus:ring-chrome-yellow/55"
              />
              <div className="relative min-w-0">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  enterKeyHint="done"
                  value={minutesValue}
                  onChange={(e) => handleMinutesChange(index, e.target.value)}
                  onBlur={() => handleMinutesBlur(index)}
                  placeholder="0"
                  aria-label="分钟"
                  className="depot-display min-h-12 w-full rounded-[10px] border border-terracotta/25 bg-calico py-2 pl-2 pr-6 text-center text-base font-bold tabular-nums placeholder:text-stone-400 focus:border-terracotta focus:bg-white focus:outline-none focus:ring-2 focus:ring-chrome-yellow/55"
                />
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-stone-light">分</span>
              </div>
              <div className="flex shrink-0 items-center">
                {showQuickTimer && (
                <button
                  type="button"
                  aria-label={isActive ? `查看「${taskName}」` : `为「${taskName}」计时`}
                  title={isActive ? '查看计时' : '开始计时'}
                  onClick={() => onQuickTimer(item)}
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chrome-yellow active:opacity-80 ${
                    isActive
                      ? 'border-chrome-yellow bg-terracotta text-chrome-yellow'
                      : 'border-terracotta/20 text-terracotta hover:bg-terracotta hover:text-chrome-yellow'
                  }`}
                >
                  <TimerIcon active={isActive} />
                </button>
                )}
                <button
                  type="button"
                  aria-label="删除项目"
                  onClick={() => handleRemove(index)}
                  disabled={rows.length === 1 && !item.name && item.minutes === 0}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] text-stone-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chrome-yellow hover:bg-cream-dark hover:text-terracotta disabled:cursor-default disabled:opacity-30"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5" /></svg>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <button
        type="button"
        onClick={handleAdd}
        className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-[10px] border border-dashed border-terracotta/40 bg-calico py-2 text-sm font-bold text-terracotta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chrome-yellow hover:bg-cream-dark"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
        添加项目
      </button>
      </div>}
    </section>
  )
}
