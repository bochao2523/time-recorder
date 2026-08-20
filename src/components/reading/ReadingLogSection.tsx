import type { CategorySubItem, ReadingLogEntry } from '../../types'
import { countReadingPages, totalReadingPages } from '../../lib/readingLogs'

interface ReadingLogSectionProps {
  entries: ReadingLogEntry[]
  readingItems: CategorySubItem[]
  activeTaskNames: string[]
  onChange: (entries: ReadingLogEntry[]) => void
  onEnsureReadingTask: (bookTitle: string) => void
  onStartTimer: (bookTitle: string) => void
}

function createReadingLog(): ReadingLogEntry {
  const randomId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return {
    id: `reading-${randomId}`,
    bookTitle: '',
    startPage: null,
    endPage: null,
  }
}

function parsePage(raw: string): number | null {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return null
  const page = parseInt(digits, 10)
  if (!Number.isInteger(page) || page < 1) return null
  return Math.min(page, 99_999)
}

function BookIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 5.5A3.5 3.5 0 0 1 6.5 2H11v17H6.5A3.5 3.5 0 0 0 3 22V5.5Z" />
      <path d="M21 5.5A3.5 3.5 0 0 0 17.5 2H13v17h4.5A3.5 3.5 0 0 1 21 22V5.5Z" />
    </svg>
  )
}

function TimerIcon({ active }: { active: boolean }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      {active
        ? <path d="M12 7v5l3 2" />
        : <path d="m10 8 6 4-6 4V8Z" fill="currentColor" stroke="none" />}
    </svg>
  )
}

export function ReadingLogSection({
  entries,
  readingItems,
  activeTaskNames,
  onChange,
  onEnsureReadingTask,
  onStartTimer,
}: ReadingLogSectionProps) {
  const totalPages = totalReadingPages(entries)

  const updateEntry = (id: string, patch: Partial<ReadingLogEntry>) => {
    onChange(entries.map((entry) => entry.id === id ? { ...entry, ...patch } : entry))
  }

  const removeEntry = (id: string) => {
    onChange(entries.filter((entry) => entry.id !== id))
  }

  return (
    <section
      className="calico-surface stitched-light overflow-hidden rounded-[14px] px-3.5 py-4 sm:px-4"
      aria-labelledby="reading-log-title"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-[#496859] text-calico">
          <BookIcon />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="reading-log-title" className="text-base font-extrabold text-terracotta">阅读进度</h2>
          <p className="mt-0.5 text-xs font-medium text-stone-light">书名会同步到上方“阅读”任务</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="depot-display text-xl font-extrabold leading-none text-terracotta tabular-nums">{totalPages}</p>
          <p className="mt-1 text-[10px] font-bold text-stone-light">今日页数</p>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="mt-4 border-y border-dashed border-terracotta/25 py-5 text-center">
          <p className="text-sm font-bold text-terracotta">今天还没有阅读进度</p>
          <p className="mx-auto mt-1 max-w-[17rem] text-xs leading-5 text-stone-light">
            记录书名和起止页，之后可以直接为这本书计时。
          </p>
        </div>
      ) : (
        <ol className="mt-4 border-t border-dashed border-terracotta/30">
          {entries.map((entry, index) => {
            const title = entry.bookTitle.trim()
            const pages = countReadingPages(entry)
            const isReversed = entry.startPage != null && entry.endPage != null && entry.endPage < entry.startPage
            const linkedItem = readingItems.find((item) => item.name.trim() === title)
            const isActive = title.length > 0 && activeTaskNames.some((name) => name.trim() === title)

            return (
              <li key={entry.id} className="border-b border-dashed border-terracotta/25 py-4">
                <div className="flex items-center gap-2">
                  <label className="min-w-0 flex-1">
                    <span className="sr-only">第 {index + 1} 次阅读的书名</span>
                    <input
                      type="text"
                      value={entry.bookTitle}
                      maxLength={80}
                      onChange={(event) => updateEntry(entry.id, { bookTitle: event.target.value })}
                      onBlur={() => onEnsureReadingTask(entry.bookTitle)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') event.currentTarget.blur()
                      }}
                      placeholder="正在读什么书？"
                      className="min-h-12 w-full rounded-[10px] border border-terracotta/25 bg-calico px-3 py-2 text-base font-bold text-stone-800 placeholder:font-medium placeholder:text-stone-400 focus:border-terracotta focus:bg-white focus:outline-none focus:ring-2 focus:ring-chrome-yellow/55"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => removeEntry(entry.id)}
                    aria-label={`删除第 ${index + 1} 次阅读记录`}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] text-stone-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chrome-yellow active:bg-cream-dark active:text-terracotta"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5" /></svg>
                  </button>
                </div>

                <div className="mt-2.5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2">
                  <label className="min-w-0 text-xs font-bold text-stone-light">
                    从第几页
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={entry.startPage ?? ''}
                      onChange={(event) => updateEntry(entry.id, { startPage: parsePage(event.target.value) })}
                      placeholder="起始页"
                      className="depot-display mt-1 min-h-12 w-full rounded-[10px] border border-terracotta/25 bg-calico px-3 py-2 text-center text-base font-bold tabular-nums text-stone-800 placeholder:font-sans placeholder:text-sm placeholder:font-medium placeholder:text-stone-400 focus:border-terracotta focus:bg-white focus:outline-none focus:ring-2 focus:ring-chrome-yellow/55"
                    />
                  </label>
                  <svg className="mb-3 text-terracotta/60" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14M15 8l4 4-4 4" /></svg>
                  <label className="min-w-0 text-xs font-bold text-stone-light">
                    到第几页
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={entry.endPage ?? ''}
                      onChange={(event) => updateEntry(entry.id, { endPage: parsePage(event.target.value) })}
                      placeholder="结束页"
                      className="depot-display mt-1 min-h-12 w-full rounded-[10px] border border-terracotta/25 bg-calico px-3 py-2 text-center text-base font-bold tabular-nums text-stone-800 placeholder:font-sans placeholder:text-sm placeholder:font-medium placeholder:text-stone-400 focus:border-terracotta focus:bg-white focus:outline-none focus:ring-2 focus:ring-chrome-yellow/55"
                    />
                  </label>
                </div>

                <div className="mt-3 flex min-h-12 items-center gap-2 border-t border-dashed border-terracotta/20 pt-3">
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-bold ${isReversed ? 'text-[#9f3f38]' : 'text-terracotta'}`} aria-live="polite">
                      {isReversed
                        ? '结束页不能小于起始页'
                        : pages > 0
                          ? `本次阅读 ${pages} 页`
                          : '填写完整页码后自动计算'}
                    </p>
                    <p className="mt-1 truncate text-[11px] text-stone-light">
                      {title
                        ? linkedItem && linkedItem.minutes > 0
                          ? `已关联阅读任务 · 今日 ${linkedItem.minutes} 分钟`
                          : '已关联阅读任务 · 尚未计时'
                        : '填写书名后关联计时'}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!title}
                    onClick={() => {
                      onEnsureReadingTask(entry.bookTitle)
                      onStartTimer(entry.bookTitle)
                    }}
                    aria-label={isActive ? `查看「${title}」计时` : title ? `为「${title}」计时` : '填写书名后计时'}
                    className={`flex h-12 shrink-0 items-center gap-1.5 rounded-[10px] border px-3 text-xs font-extrabold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chrome-yellow active:opacity-80 disabled:cursor-not-allowed disabled:opacity-35 ${
                      isActive
                        ? 'border-chrome-yellow bg-terracotta text-chrome-yellow'
                        : 'border-terracotta/25 bg-calico text-terracotta'
                    }`}
                  >
                    <TimerIcon active={isActive} />
                    {isActive ? '查看计时' : '开始计时'}
                  </button>
                </div>
              </li>
            )
          })}
        </ol>
      )}

      <button
        type="button"
        onClick={() => onChange([...entries, createReadingLog()])}
        className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-[10px] border border-dashed border-terracotta/40 bg-calico px-3 py-2 text-sm font-extrabold text-terracotta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chrome-yellow active:bg-cream-dark"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
        添加阅读记录
      </button>
    </section>
  )
}
