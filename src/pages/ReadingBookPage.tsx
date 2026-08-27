import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ReadingInsights } from '../components/reading/ReadingInsights'
import { ReadingRecordManager } from '../components/reading/ReadingRecordManager'
import { useRecords } from '../context/RecordsContext'
import { useTimer } from '../context/TimerContext'
import { formatMinutes, today } from '../lib/dateUtils'
import { buildReadingBookInsights, collectReadingSessions } from '../lib/readingInsights'
import { MAX_ACTIVE_TIMERS } from '../lib/timerStorage'

function BackIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m15 18-6-6 6-6" /></svg>
}

function BookGlyph() {
  return <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /><path d="M8 6h8" /></svg>
}

export function ReadingBookPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const requestedTitle = searchParams.get('title')?.trim() ?? ''
  const {
    records,
    readingBooks,
    setReadingBookTotalPages,
    updateReadingLogPages,
    deleteReadingLog,
    deleteReadingBook,
  } = useRecords()
  const { sessions, pendingReadingCompletion, start, pushNotice } = useTimer()

  const book = readingBooks.find((entry) => entry.title.toLocaleLowerCase() === requestedTitle.toLocaleLowerCase())
  const allReadingSessions = useMemo(() => collectReadingSessions(records), [records])
  const insights = useMemo(
    () => book ? buildReadingBookInsights(allReadingSessions, book.title, book.totalPages) : null,
    [allReadingSessions, book],
  )
  const activeReadingTimer = sessions.find((timer) => timer.completionKind === 'reading')
  const thisBookIsTiming = Boolean(book && activeReadingTimer?.taskName.toLocaleLowerCase() === book.title.toLocaleLowerCase())
  const finished = Boolean(book && insights && insights.currentPage >= book.totalPages)

  if (!book || !insights) {
    return <div className="no-layout-animation space-y-4">
      <button type="button" onClick={() => navigate('/reading')} className="flex min-h-11 items-center gap-1 rounded-[10px] px-2 text-sm font-extrabold text-terracotta"><BackIcon />返回书架</button>
      <section className="calico-surface stitched-light rounded-[14px] p-6 text-center">
        <h1 className="text-xl font-extrabold text-terracotta">没有找到这本书</h1>
        <p className="mt-2 text-sm leading-6 text-stone-light">它可能已被删除，或书籍链接已经失效。</p>
        <button type="button" onClick={() => navigate('/reading')} className="mt-5 min-h-12 rounded-[10px] bg-terracotta px-5 font-extrabold text-calico">回到我的书架</button>
      </section>
    </div>
  }

  const progress = Math.round(insights.progressPercent ?? 0)
  const startBook = () => {
    if (finished) return
    if (pendingReadingCompletion) return pushNotice({ message: '请先完成上一次阅读的页码录入', type: 'error' })
    if (activeReadingTimer) {
      return pushNotice({
        message: thisBookIsTiming ? `《${book.title}》正在阅读中` : `请先结束《${activeReadingTimer.taskName}》的阅读`,
        type: 'error',
      })
    }
    const ok = start(book.title, 'reading', { mode: 'stopwatch', completionKind: 'reading', date: today() })
    if (!ok) pushNotice({ message: sessions.length >= MAX_ACTIVE_TIMERS ? `最多同时运行 ${MAX_ACTIVE_TIMERS} 个计时器` : '阅读计时未开始', type: 'error' })
  }

  return <div className="no-layout-animation space-y-4">
    <header className="flex min-h-11 items-center gap-2">
      <button type="button" onClick={() => navigate('/reading')} className="flex min-h-11 shrink-0 items-center gap-1 rounded-[10px] px-2 text-sm font-extrabold text-terracotta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta"><BackIcon />书架</button>
      <span className="h-5 w-px bg-terracotta/20" aria-hidden />
      <p className="min-w-0 truncate text-sm font-bold text-stone-light">书籍详情</p>
    </header>

    <section className="depot-cloth stitched-panel overflow-hidden rounded-[14px] p-4 text-chrome-yellow" aria-labelledby="reading-book-title">
      <div className="flex items-start gap-4">
        <span className={`grid h-24 w-[4.5rem] shrink-0 place-items-center rounded-[8px_14px_14px_8px] shadow-[inset_9px_0_12px_rgba(20,11,2,0.26),0_7px_14px_rgba(5,34,27,0.24)] ${finished ? 'bg-steel text-white' : 'bg-[#e9a62e] text-terracotta'}`}><BookGlyph /></span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-extrabold tracking-[0.15em] text-chrome-yellow/60">{finished ? '已读完' : '正在阅读'}</p>
          <h1 id="reading-book-title" className="mt-1 break-words text-2xl font-extrabold leading-tight">{book.title}</h1>
          <p className="mt-2 text-sm font-bold text-chrome-yellow/70">{insights.currentPage ? `第 ${insights.currentPage} / ${book.totalPages} 页` : `尚未开始 · 共 ${book.totalPages} 页`}</p>
        </div>
        <strong className="depot-display shrink-0 text-2xl tabular-nums">{progress}%</strong>
      </div>
      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-black/20"><span className="block h-full rounded-full bg-chrome-yellow" style={{ width: `${progress}%` }} /></div>
      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-dashed border-chrome-yellow/30 pt-4">
        <div><p className="text-xs font-bold text-chrome-yellow/60">累计阅读</p><p className="depot-display mt-1 text-lg font-extrabold tabular-nums">{formatMinutes(insights.totalMinutes)}</p></div>
        <div><p className="text-xs font-bold text-chrome-yellow/60">阅读记录</p><p className="depot-display mt-1 text-lg font-extrabold tabular-nums">{insights.sessions.length} 次</p></div>
      </div>
      {!finished && <button type="button" onClick={startBook} disabled={Boolean(activeReadingTimer) || Boolean(pendingReadingCompletion)} className="mt-4 min-h-13 w-full rounded-[11px] bg-chrome-yellow px-4 text-base font-extrabold text-terracotta shadow-[0_3px_0_rgba(87,58,0,0.45)] disabled:cursor-not-allowed disabled:opacity-40">{thisBookIsTiming ? '正在阅读' : '开始阅读'}</button>}
    </section>

    <ReadingInsights
      bookTitles={[book.title]}
      selectedTitle={book.title}
      onSelectTitle={() => undefined}
      insights={insights}
      totalPages={book.totalPages}
      onSaveTotalPages={(totalPages) => {
        setReadingBookTotalPages(book.title, totalPages)
        pushNotice({ message: `《${book.title}》总页数已更新`, type: 'success' })
      }}
      showBookSelector={false}
    />

    <ReadingRecordManager
      bookTitle={book.title}
      totalPages={book.totalPages}
      sessions={insights.sessions}
      bookTimerActive={thisBookIsTiming}
      onUpdateSession={(session, startPage, endPage) => {
        const updated = updateReadingLogPages(session.date, session.id, startPage, endPage)
        pushNotice({ message: updated ? '本次阅读页码已更新' : '没有找到这条阅读记录', type: updated ? 'success' : 'error' })
      }}
      onDeleteSession={(session) => {
        const deleted = deleteReadingLog(session.date, session.id)
        pushNotice({ message: deleted ? '这次阅读记录已删除' : '没有找到这条阅读记录', type: deleted ? 'success' : 'error' })
      }}
      onDeleteBook={(deleteHistory) => {
        deleteReadingBook(book.title, deleteHistory)
        pushNotice({ message: deleteHistory ? `《${book.title}》及阅读记录已删除` : `《${book.title}》已从书架删除`, type: 'success' })
        navigate('/reading', { replace: true })
      }}
    />
  </div>
}
