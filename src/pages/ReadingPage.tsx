import { useMemo, useState } from 'react'
import { PageCard } from '../components/layout/Layout'
import { useRecords } from '../context/RecordsContext'
import { useTimer } from '../context/TimerContext'
import { formatDisplayDate, formatMinutes, today } from '../lib/dateUtils'
import { countReadingPages, totalReadingPages } from '../lib/readingLogs'
import { formatElapsed } from '../lib/timerStorage'

type ReadingSessionRow = {
  id: string
  bookTitle: string
  date: string
  startPage: number | null
  endPage: number | null
  minutes: number
  completedAt: string
  legacy: boolean
}

export function ReadingPage() {
  const { records, getRecordByDate } = useRecords()
  const {
    session,
    displayMs,
    pendingReadingCompletion,
    start,
    pause,
    resume,
    stop,
    openModal,
    pushNotice,
  } = useTimer()
  const [bookTitle, setBookTitle] = useState('')

  const readingSessions = useMemo<ReadingSessionRow[]>(() => records
    .flatMap((record) => (record.readingLogs ?? []).map((entry) => ({
      id: entry.id,
      bookTitle: entry.bookTitle,
      date: record.date,
      startPage: entry.startPage,
      endPage: entry.endPage,
      minutes: entry.minutes ?? 0,
      completedAt: entry.completedAt ?? `${record.date}T00:00:00`,
      legacy: entry.minutes == null,
    })))
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt)), [records])

  const recentBooks = useMemo(() => {
    const seen = new Set<string>()
    const result: string[] = []
    for (const row of readingSessions) {
      const title = row.bookTitle.trim()
      if (!title || seen.has(title)) continue
      seen.add(title)
      result.push(title)
      if (result.length >= 5) break
    }
    return result
  }, [readingSessions])

  const todayRecord = getRecordByDate(today())
  const todayLogs = todayRecord?.readingLogs ?? []
  const todayMinutes = todayRecord?.minutes.reading ?? 0
  const todayPages = totalReadingPages(todayLogs)
  const activeReading = session?.completionKind === 'reading'

  const handleStart = () => {
    const title = bookTitle.trim()
    if (!title) {
      pushNotice({ message: '请先选择或填写书名', type: 'error' })
      return
    }
    if (pendingReadingCompletion) {
      pushNotice({ message: '请先填写上一次阅读的页码', type: 'error' })
      return
    }
    if (session) {
      pushNotice({ message: `「${session.taskName}」正在计时`, type: 'error' })
      openModal()
      return
    }
    const ok = start(title, 'reading', {
      date: today(),
      mode: 'stopwatch',
      completionKind: 'reading',
    })
    if (!ok) pushNotice({ message: '阅读计时未开始，请重试', type: 'error' })
  }

  const handleStop = () => {
    stop()
  }

  return (
    <div className="no-layout-animation space-y-3">
      {activeReading && session ? (
        <section className="depot-cloth stitched-panel overflow-hidden rounded-[14px] p-4 sm:p-5" aria-labelledby="reading-active-title">
          <div className="flex min-w-0 items-center gap-3">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${session.status === 'paused' ? 'bg-calico/60' : 'bg-chrome-yellow'}`} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-chrome-yellow/75">{session.status === 'paused' ? '阅读已暂停' : '正在阅读'}</p>
              <h2 id="reading-active-title" className="mt-0.5 truncate text-xl font-extrabold text-chrome-yellow">{session.taskName}</h2>
            </div>
          </div>

          <p className="stable-timer-slot depot-display my-7 text-center text-[3.5rem] font-extrabold leading-none tracking-[0.02em] tabular-nums text-chrome-yellow sm:text-7xl">
            {formatElapsed(displayMs)}
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={session.status === 'paused' ? resume : pause}
              className="min-h-12 rounded-[10px] border border-chrome-yellow/60 px-4 text-sm font-extrabold text-chrome-yellow active:bg-white/10"
            >
              {session.status === 'paused' ? '继续阅读' : '暂停'}
            </button>
            <button
              type="button"
              onClick={handleStop}
              className="min-h-12 rounded-[10px] bg-chrome-yellow px-4 text-sm font-extrabold text-terracotta active:bg-[#e8bf00]"
            >
              结束并填写页码
            </button>
          </div>
          <p className="mt-3 text-center text-xs text-chrome-yellow/65">结束后再输入起始页和结束页</p>
        </section>
      ) : (
        <section className="depot-cloth stitched-panel overflow-hidden rounded-[14px] p-4 sm:p-5" aria-labelledby="choose-book-title">
          <div className="flex items-start gap-3">
            <span className="depot-eyelet mt-1" aria-hidden />
            <div className="min-w-0">
              <h2 id="choose-book-title" className="text-xl font-extrabold text-chrome-yellow">先选择今天要读的书</h2>
              <p className="mt-1 text-xs leading-5 text-chrome-yellow/70">现在只记录书名；结束计时的时候再填写页码。</p>
            </div>
          </div>

          {recentBooks.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-bold text-chrome-yellow/70">最近阅读</p>
              <div className="mt-2 flex max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {recentBooks.map((title) => {
                  const selected = bookTitle.trim() === title
                  return (
                    <button
                      key={title}
                      type="button"
                      onClick={() => setBookTitle(title)}
                      className={`min-h-11 max-w-[13rem] shrink-0 truncate rounded-[10px] border px-3 text-sm font-bold ${selected ? 'border-chrome-yellow bg-chrome-yellow text-terracotta' : 'border-chrome-yellow/45 text-chrome-yellow active:bg-white/10'}`}
                    >
                      {title}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <label className="mt-4 block text-xs font-bold text-chrome-yellow/75">
            书名
            <input
              id="reading-book-input"
              type="text"
              value={bookTitle}
              onChange={(event) => setBookTitle(event.target.value.slice(0, 80))}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleStart()
              }}
              placeholder="输入书名，例如《设计心理学》"
              autoComplete="off"
              className="mt-1 min-h-12 w-full rounded-[10px] border border-chrome-yellow/45 bg-calico px-3 text-base font-bold text-terracotta placeholder:font-medium placeholder:text-stone-light focus:border-chrome-yellow focus:outline-none focus:ring-2 focus:ring-chrome-yellow/60"
            />
          </label>

          <button
            type="button"
            onClick={handleStart}
            disabled={!bookTitle.trim() || Boolean(session) || Boolean(pendingReadingCompletion)}
            className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-chrome-yellow px-4 text-base font-extrabold text-terracotta disabled:cursor-not-allowed disabled:opacity-45 active:bg-[#e8bf00]"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="9" /><path d="m10 8 6 4-6 4V8Z" /></svg>
            开始阅读计时
          </button>
        </section>
      )}

      {!activeReading && session && (
        <PageCard className="p-4">
          <p className="text-sm font-extrabold text-terracotta">已有其他任务正在计时</p>
          <p className="mt-1 truncate text-xs text-stone-light">{session.taskName} · 结束后才能开始阅读</p>
          <button type="button" onClick={openModal} className="mt-3 min-h-11 w-full rounded-[10px] border border-terracotta/30 text-sm font-bold text-terracotta active:bg-cream-dark">查看当前计时</button>
        </PageCard>
      )}

      <section className="calico-surface stitched-light rounded-[14px] p-4" aria-labelledby="reading-today-title">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 id="reading-today-title" className="text-base font-extrabold text-terracotta">今天的阅读</h2>
            <p className="mt-0.5 text-xs text-stone-light">保存页码后自动汇总</p>
          </div>
          <div className="flex shrink-0 items-baseline gap-1 text-terracotta">
            <span className="depot-display text-3xl font-extrabold tabular-nums">{todayPages}</span>
            <span className="text-xs font-bold">页</span>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-dashed border-terracotta/25 pt-3 text-xs">
          <span className="text-stone-light">{todayLogs.length} 次阅读</span>
          <span className="font-bold text-terracotta">主页面已记录 {formatMinutes(todayMinutes)}</span>
        </div>
      </section>

      <section aria-labelledby="reading-history-title">
        <div className="flex items-end justify-between gap-3 px-1 pb-2 pt-1">
          <h2 id="reading-history-title" className="text-base font-extrabold text-terracotta">最近阅读</h2>
          <p className="text-xs text-stone-light">页码与计时记录</p>
        </div>

        {readingSessions.length === 0 ? (
          <PageCard className="p-5 text-center">
            <p className="text-sm font-extrabold text-terracotta">还没有阅读记录</p>
            <p className="mt-1 text-xs leading-5 text-stone-light">选择一本书开始计时，结束时填写页码，第一条记录就会出现在这里。</p>
          </PageCard>
        ) : (
          <ol className="space-y-2">
            {readingSessions.slice(0, 12).map((row) => {
              const pages = countReadingPages({
                id: row.id,
                bookTitle: row.bookTitle,
                startPage: row.startPage,
                endPage: row.endPage,
              })
              return (
                <li key={`${row.date}-${row.id}`} className="calico-surface stitched-light rounded-[14px] p-3.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] bg-steel text-calico" aria-hidden>
                      <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold text-terracotta">{row.bookTitle}</p>
                      <p className="mt-0.5 text-xs text-stone-light">
                        {row.startPage != null && row.endPage != null
                          ? `第 ${row.startPage}–${row.endPage} 页`
                          : '旧记录 · 未填写完整页码'}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="depot-display text-xl font-extrabold tabular-nums text-terracotta">{pages}<span className="ml-0.5 text-xs">页</span></p>
                      <p className="text-[11px] text-stone-light">{row.minutes > 0 ? `${row.minutes} 分钟` : row.legacy ? '旧记录' : '不足 1 分钟'}</p>
                    </div>
                  </div>
                  <p className="mt-2 border-t border-dashed border-terracotta/18 pt-2 text-[11px] text-stone-light">{formatDisplayDate(row.date)}</p>
                </li>
              )
            })}
          </ol>
        )}
      </section>
    </div>
  )
}
