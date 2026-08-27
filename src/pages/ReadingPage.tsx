import { useEffect, useMemo, useState } from 'react'
import { ReadingInsights } from '../components/reading/ReadingInsights'
import { useRecords } from '../context/RecordsContext'
import { useTimer } from '../context/TimerContext'
import { formatMinutes, formatShortDate, today } from '../lib/dateUtils'
import { totalReadingPages } from '../lib/readingLogs'
import { buildReadingBookInsights, collectReadingSessions, type ReadingBookInsights } from '../lib/readingInsights'
import { MAX_ACTIVE_TIMERS } from '../lib/timerStorage'
import type { ReadingBookMeta } from '../types'

type BookView = { meta: ReadingBookMeta; insights: ReadingBookInsights; finished: boolean }

export function ReadingPage() {
  const { records, readingBooks, getRecordByDate, setReadingBookTotalPages } = useRecords()
  const { sessions, pendingReadingCompletion, start, openModal, pushNotice } = useTimer()
  const [showAdd, setShowAdd] = useState(readingBooks.length === 0)
  const [titleInput, setTitleInput] = useState('')
  const [pagesInput, setPagesInput] = useState('')
  const [selectedTitle, setSelectedTitle] = useState('')

  const readingSessions = useMemo(() => collectReadingSessions(records), [records])
  const books = useMemo<BookView[]>(() => readingBooks.map((meta) => {
    const insights = buildReadingBookInsights(readingSessions, meta.title, meta.totalPages)
    return { meta, insights, finished: insights.currentPage >= meta.totalPages }
  }).sort((a, b) => Number(a.finished) - Number(b.finished) || b.meta.updatedAt.localeCompare(a.meta.updatedAt)), [readingBooks, readingSessions])
  const activeBooks = books.filter((book) => !book.finished)
  const finishedBooks = books.filter((book) => book.finished)
  const dedicatedTimer = sessions.find((timer) => timer.completionKind === 'reading')
  const otherTimerCount = sessions.filter((timer) => timer.completionKind !== 'reading').length

  useEffect(() => {
    if (selectedTitle && books.some((book) => book.meta.title === selectedTitle)) return
    setSelectedTitle(books[0]?.meta.title ?? '')
  }, [books, selectedTitle])

  const selected = books.find((book) => book.meta.title === selectedTitle)
  const todayRecord = getRecordByDate(today())
  const todayLogs = todayRecord?.readingLogs ?? []
  const todayBookMinutes = todayLogs.reduce((sum, log) => sum + (log.minutes ?? 0), 0)
  const validPages = Number(pagesInput)
  const canAdd = titleInput.trim().length > 0 && Number.isInteger(validPages) && validPages >= 1

  const addBook = (event: React.FormEvent) => {
    event.preventDefault()
    if (!canAdd) return
    const title = titleInput.trim()
    const duplicate = readingBooks.find((book) => book.title.toLocaleLowerCase() === title.toLocaleLowerCase())
    if (duplicate) {
      pushNotice({ message: `「${duplicate.title}」已在书架中`, type: 'error' })
      setSelectedTitle(duplicate.title)
      return
    }
    setReadingBookTotalPages(title, validPages)
    setSelectedTitle(title)
    setTitleInput('')
    setPagesInput('')
    setShowAdd(false)
    pushNotice({ message: `已添加《${title}》`, type: 'success' })
  }

  const startBook = (book: BookView) => {
    if (book.finished) return
    if (pendingReadingCompletion) {
      pushNotice({ message: '请先完成上一次阅读的页码录入', type: 'error' })
      return
    }
    if (dedicatedTimer) {
      pushNotice({ message: `《${dedicatedTimer.taskName}》正在阅读中`, type: 'error' })
      return
    }
    const ok = start(book.meta.title, 'reading', { mode: 'stopwatch', completionKind: 'reading', date: today() })
    if (!ok) pushNotice({ message: sessions.length >= MAX_ACTIVE_TIMERS ? `最多同时运行 ${MAX_ACTIVE_TIMERS} 个计时器` : '阅读计时未开始', type: 'error' })
  }

  const BookCard = ({ book }: { book: BookView }) => {
    const percent = Math.round(book.insights.progressPercent ?? 0)
    return <article className="calico-surface stitched-light overflow-hidden rounded-[14px] p-4">
      <button type="button" onClick={() => setSelectedTitle(book.meta.title)} className="flex min-h-20 w-full items-center gap-4 text-left">
        <span className={`grid h-20 w-16 shrink-0 place-items-center rounded-[7px_13px_13px_7px] border text-2xl shadow-[inset_7px_0_10px_rgba(34,17,3,0.18)] ${book.finished ? 'border-steel/35 bg-steel text-white' : 'border-chrome-yellow/40 bg-[#e4a52e] text-terracotta'}`} aria-hidden>📖</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-lg font-extrabold text-terracotta">{book.meta.title}</span>
          <span className="mt-1 block text-xs font-bold text-stone-light">{book.finished ? '已读完' : book.insights.currentPage ? `读到 ${book.insights.currentPage} / ${book.meta.totalPages} 页` : `尚未开始 · 共 ${book.meta.totalPages} 页`}</span>
          <span className="mt-3 block h-2 overflow-hidden rounded-full bg-terracotta/10"><span className="block h-full rounded-full bg-[#1769d2]" style={{ width: `${percent}%` }} /></span>
        </span>
        <span className="depot-display shrink-0 text-xl font-extrabold tabular-nums text-terracotta">{percent}%</span>
      </button>
      {book.finished ? <div className="mt-3 grid grid-cols-3 gap-2 border-t border-dashed border-terracotta/25 pt-3 text-center">
        <span><b className="block text-sm text-terracotta">{formatMinutes(book.insights.totalMinutes)}</b><small className="text-stone-light">总时间</small></span>
        <span><b className="block text-sm text-terracotta">{book.insights.readingDays} 天</b><small className="text-stone-light">阅读天数</small></span>
        <span><b className="block text-xs text-terracotta">{book.insights.firstDate ? `${formatShortDate(book.insights.firstDate)}–${formatShortDate(book.insights.lastDate ?? book.insights.firstDate)}` : '—'}</b><small className="text-stone-light">阅读日期</small></span>
      </div> : <button type="button" onClick={() => startBook(book)} disabled={Boolean(dedicatedTimer) || Boolean(pendingReadingCompletion)} className="mt-3 min-h-12 w-full rounded-[10px] bg-[#1769d2] text-sm font-extrabold text-white disabled:opacity-35">开始阅读</button>}
    </article>
  }

  return <div className="no-layout-animation space-y-3">
    <section className="depot-cloth stitched-panel rounded-[14px] p-4 text-chrome-yellow">
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-chrome-yellow/65">BOOK DEPOT</p><h2 className="mt-1 text-2xl font-extrabold">我的书架</h2><p className="mt-1 text-xs text-chrome-yellow/70">书名和总页数是书籍进度的基础</p></div><button type="button" onClick={() => setShowAdd((value) => !value)} className="min-h-11 shrink-0 rounded-[9px] bg-chrome-yellow px-3 text-sm font-extrabold text-terracotta">{showAdd ? '取消' : '+ 添加书籍'}</button></div>
      {showAdd && <form onSubmit={addBook} className="mt-4 grid gap-3 border-t border-dashed border-chrome-yellow/30 pt-4 sm:grid-cols-[1fr_9rem_auto] sm:items-end"><label className="text-xs font-bold">书名<input value={titleInput} onChange={(event) => setTitleInput(event.target.value.slice(0, 80))} placeholder="例如：设计心理学" className="mt-1 min-h-12 w-full rounded-[10px] border border-chrome-yellow/40 bg-calico px-3 text-base font-bold text-terracotta outline-none focus:ring-2 focus:ring-chrome-yellow" /></label><label className="text-xs font-bold">总页数<input value={pagesInput} onChange={(event) => setPagesInput(event.target.value.replace(/\D/g, '').slice(0, 5))} inputMode="numeric" placeholder="412" className="depot-display mt-1 min-h-12 w-full rounded-[10px] border border-chrome-yellow/40 bg-calico px-3 text-base font-bold text-terracotta outline-none focus:ring-2 focus:ring-chrome-yellow" /></label><button disabled={!canAdd} className="min-h-12 rounded-[10px] bg-chrome-yellow px-5 font-extrabold text-terracotta disabled:opacity-35">保存</button></form>}
    </section>

    <section className="calico-surface stitched-light rounded-[14px] p-4"><div className="flex items-center justify-between"><div><h2 className="text-lg font-extrabold text-terracotta">今天的书籍阅读</h2><p className="mt-1 text-xs text-stone-light">不包含普通“阅读”任务计时</p></div><div className="text-right"><b className="depot-display block text-2xl text-terracotta">{totalReadingPages(todayLogs)} 页</b><small className="font-bold text-stone-light">{todayLogs.length} 次 · {formatMinutes(todayBookMinutes)}</small></div></div></section>

    {activeBooks.length > 0 && <section aria-labelledby="reading-books-active"><div className="mb-2 flex items-end justify-between px-1"><h2 id="reading-books-active" className="text-xl font-extrabold text-terracotta">正在阅读</h2><span className="text-xs font-bold text-stone-light">{activeBooks.length} 本</span></div><div className="space-y-3">{activeBooks.map((book) => <BookCard key={book.meta.title} book={book} />)}</div></section>}
    {finishedBooks.length > 0 && <section aria-labelledby="reading-books-finished"><div className="mb-2 flex items-end justify-between px-1"><h2 id="reading-books-finished" className="text-xl font-extrabold text-terracotta">已读完</h2><span className="text-xs font-bold text-stone-light">{finishedBooks.length} 本</span></div><div className="space-y-3">{finishedBooks.map((book) => <BookCard key={book.meta.title} book={book} />)}</div></section>}
    {!books.length && !showAdd && <button type="button" onClick={() => setShowAdd(true)} className="calico-surface stitched-light min-h-36 w-full rounded-[14px] px-5 text-center font-extrabold text-terracotta">添加第一本书</button>}
    {otherTimerCount > 0 && <button type="button" onClick={openModal} className="min-h-12 w-full rounded-[12px] border border-terracotta/25 bg-calico text-sm font-bold text-terracotta">还有 {otherTimerCount} 个其他任务在计时 · 查看</button>}
    {selected && <ReadingInsights bookTitles={books.map((book) => book.meta.title)} selectedTitle={selectedTitle} onSelectTitle={setSelectedTitle} insights={selected.insights} totalPages={selected.meta.totalPages} onSaveTotalPages={(totalPages) => { setReadingBookTotalPages(selectedTitle, totalPages); pushNotice({ message: '已更新总页数', type: 'success' }) }} />}
  </div>
}
