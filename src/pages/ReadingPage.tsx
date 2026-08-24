import { useEffect, useMemo, useState } from 'react'
import { PageCard } from '../components/layout/Layout'
import { ReadingInsights } from '../components/reading/ReadingInsights'
import { useRecords } from '../context/RecordsContext'
import { useTimer } from '../context/TimerContext'
import { formatMinutes, today } from '../lib/dateUtils'
import { totalReadingPages } from '../lib/readingLogs'
import { buildReadingBookInsights, collectReadingSessions, recentReadingBooks } from '../lib/readingInsights'
import { formatElapsed, getDisplayMs, MAX_ACTIVE_TIMERS } from '../lib/timerStorage'

export function ReadingPage() {
  const { records, readingBooks, getRecordByDate, setReadingBookTotalPages } = useRecords()
  const {
    sessions,
    now,
    pendingReadingCompletion,
    start,
    pause,
    resume,
    stop,
    openModal,
    pushNotice,
  } = useTimer()
  const [bookTitle, setBookTitle] = useState('')
  const [selectedAnalysisBook, setSelectedAnalysisBook] = useState('')

  const readingSessions = useMemo(() => collectReadingSessions(records), [records])
  const recentBooks = useMemo(() => recentReadingBooks(readingSessions, 5), [readingSessions])
  const analysisBookTitles = useMemo(() => {
    const candidates = [
      ...recentReadingBooks(readingSessions, 50),
      ...sessions.filter((timer) => timer.completionKind === 'reading').map((timer) => timer.taskName),
      ...(pendingReadingCompletion ? [pendingReadingCompletion.bookTitle] : []),
      ...readingBooks.map((book) => book.title),
    ]
    const seen = new Set<string>()
    return candidates.filter((title) => {
      const key = title.trim().toLocaleLowerCase()
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [pendingReadingCompletion, readingBooks, readingSessions, sessions])

  useEffect(() => {
    if (selectedAnalysisBook && analysisBookTitles.includes(selectedAnalysisBook)) return
    setSelectedAnalysisBook(analysisBookTitles[0] ?? '')
  }, [analysisBookTitles, selectedAnalysisBook])

  const selectedBookMeta = readingBooks.find((book) => (
    book.title.toLocaleLowerCase() === selectedAnalysisBook.toLocaleLowerCase()
  ))
  const selectedInsights = useMemo(() => (
    selectedAnalysisBook
      ? buildReadingBookInsights(readingSessions, selectedAnalysisBook, selectedBookMeta?.totalPages)
      : null
  ), [readingSessions, selectedAnalysisBook, selectedBookMeta?.totalPages])

  const todayRecord = getRecordByDate(today())
  const todayLogs = todayRecord?.readingLogs ?? []
  const todayMinutes = todayRecord?.minutes.reading ?? 0
  const todayPages = totalReadingPages(todayLogs)
  const readingTimers = sessions.filter((timer) => timer.completionKind === 'reading')
  const otherTimerCount = sessions.length - readingTimers.length

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
    if (readingTimers.some((timer) => timer.taskName.trim() === title)) {
      pushNotice({ message: `「${title}」已经在独立计时`, type: 'error' })
      return
    }
    const ok = start(title, 'reading', {
      date: today(),
      mode: 'stopwatch',
      completionKind: 'reading',
    })
    if (!ok) {
      pushNotice({ message: sessions.length >= MAX_ACTIVE_TIMERS ? `最多同时运行 ${MAX_ACTIVE_TIMERS} 个计时器` : '阅读计时未开始，请重试', type: 'error' })
      return
    }
    pushNotice({ message: `已开始「${title}」独立阅读计时`, type: 'success' })
    setSelectedAnalysisBook(title)
    setBookTitle('')
  }

  return (
    <div className="no-layout-animation space-y-3">
      {readingTimers.length > 0 && (
        <section className="depot-cloth stitched-panel overflow-hidden rounded-[14px] p-4 sm:p-5" aria-labelledby="reading-active-title">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 id="reading-active-title" className="text-xl font-extrabold text-chrome-yellow">正在阅读</h2>
              <p className="mt-1 text-xs text-chrome-yellow/70">每本书可以分别暂停和结束</p>
            </div>
            <span className="depot-display text-sm font-extrabold tabular-nums text-chrome-yellow">{readingTimers.length} 本</span>
          </div>

          <ol className="mt-4 space-y-2.5">
            {readingTimers.map((timer) => (
              <li key={timer.id} className="rounded-[12px] border border-chrome-yellow/35 bg-depot-deep/45 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${timer.status === 'paused' ? 'bg-calico/55' : 'bg-chrome-yellow'}`} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-chrome-yellow">{timer.taskName}</p>
                    <p className="mt-0.5 text-[11px] text-chrome-yellow/65">{timer.status === 'paused' ? '已暂停' : '计时中'}</p>
                  </div>
                  <p className="stable-timer-slot depot-display shrink-0 text-right text-3xl font-extrabold tabular-nums text-chrome-yellow">
                    {formatElapsed(getDisplayMs(timer, now))}
                  </p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-dashed border-chrome-yellow/25 pt-3">
                  <button
                    type="button"
                    onClick={() => timer.status === 'paused' ? resume(timer.id) : pause(timer.id)}
                    className="min-h-11 rounded-[8px] border border-chrome-yellow/50 text-xs font-bold text-chrome-yellow active:bg-white/10"
                  >
                    {timer.status === 'paused' ? '继续阅读' : '暂停'}
                  </button>
                  <button
                    type="button"
                    onClick={() => stop(timer.id)}
                    className="min-h-11 rounded-[8px] bg-chrome-yellow text-xs font-extrabold text-terracotta active:bg-[#e8bf00]"
                  >
                    结束并填写页码
                  </button>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="depot-cloth stitched-panel overflow-hidden rounded-[14px] p-4 sm:p-5" aria-labelledby="choose-book-title">
          <div className="flex items-start gap-3">
            <span className="depot-eyelet mt-1" aria-hidden />
            <div className="min-w-0">
              <h2 id="choose-book-title" className="text-xl font-extrabold text-chrome-yellow">{readingTimers.length ? '开始另一本书' : '先选择今天要读的书'}</h2>
              <p className="mt-1 text-xs leading-5 text-chrome-yellow/70">每本书都有独立计时；结束的时候再填写页码。</p>
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
                      onClick={() => {
                        setBookTitle(title)
                        setSelectedAnalysisBook(title)
                      }}
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
            disabled={!bookTitle.trim() || sessions.length >= MAX_ACTIVE_TIMERS || Boolean(pendingReadingCompletion) || readingTimers.some((timer) => timer.taskName.trim() === bookTitle.trim())}
            className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-chrome-yellow px-4 text-base font-extrabold text-terracotta disabled:cursor-not-allowed disabled:opacity-45 active:bg-[#e8bf00]"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="9" /><path d="m10 8 6 4-6 4V8Z" /></svg>
            开始阅读计时
          </button>
        </section>

      {otherTimerCount > 0 && (
        <PageCard className="p-4">
          <p className="text-sm font-extrabold text-terracotta">还有 {otherTimerCount} 个其他任务在独立计时</p>
          <p className="mt-1 text-xs text-stone-light">它们不会影响阅读计时，可以分别结束。</p>
          <button type="button" onClick={openModal} className="mt-3 min-h-11 w-full rounded-[10px] border border-terracotta/30 text-sm font-bold text-terracotta active:bg-cream-dark">管理全部计时器</button>
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

      <ReadingInsights
        bookTitles={analysisBookTitles}
        selectedTitle={selectedAnalysisBook}
        onSelectTitle={setSelectedAnalysisBook}
        insights={selectedInsights}
        totalPages={selectedBookMeta?.totalPages}
        onSaveTotalPages={(totalPages) => {
          setReadingBookTotalPages(selectedAnalysisBook, totalPages)
          pushNotice({ message: `已保存「${selectedAnalysisBook}」总页数`, type: 'success' })
        }}
      />
    </div>
  )
}
