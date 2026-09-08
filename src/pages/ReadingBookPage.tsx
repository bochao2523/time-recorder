import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ReadingInsights } from '../components/reading/ReadingInsights'
import { ReadingRecordManager } from '../components/reading/ReadingRecordManager'
import { useRecords } from '../context/RecordsContext'
import { useTimer } from '../context/TimerContext'
import { useBodyScrollLock } from '../hooks/useBodyScrollLock'
import { today } from '../lib/dateUtils'
import { buildReadingBookInsights, collectReadingSessions } from '../lib/readingInsights'
import { MAX_ACTIVE_TIMERS } from '../lib/timerStorage'

function BackIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m15 18-6-6 6-6" /></svg>
}

function BookGlyph() {
  return <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /><path d="M8 6h8" /></svg>
}

function EditIcon() {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" /></svg>
}

function CloseIcon() {
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="m6 6 12 12M18 6 6 18" /></svg>
}

function BookEditSheet({
  open,
  bookTitle,
  currentPage,
  totalPages,
  allTitles,
  renameLocked,
  onClose,
  onSave,
}: {
  open: boolean
  bookTitle: string
  currentPage: number
  totalPages: number
  allTitles: string[]
  renameLocked: boolean
  onClose: () => void
  onSave: (title: string, totalPages: number) => boolean
}) {
  const [titleInput, setTitleInput] = useState(bookTitle)
  const [pagesInput, setPagesInput] = useState(String(totalPages))
  const titleRef = useRef<HTMLInputElement>(null)
  useBodyScrollLock(open, { inertRoot: true, hideRootFromScreenReaders: true })

  useEffect(() => {
    if (!open) return
    setTitleInput(bookTitle)
    setPagesInput(String(totalPages))
    const frame = requestAnimationFrame(() => titleRef.current?.focus({ preventScroll: true }))
    return () => cancelAnimationFrame(frame)
  }, [bookTitle, open, totalPages])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose, open])

  if (!open) return null
  const nextTitle = titleInput.trim()
  const nextTotal = Number(pagesInput)
  const titleChanged = nextTitle !== bookTitle
  const duplicate = allTitles.some((title) => title.toLocaleLowerCase() === nextTitle.toLocaleLowerCase() && title.toLocaleLowerCase() !== bookTitle.toLocaleLowerCase())
  const validPages = Number.isInteger(nextTotal) && nextTotal >= Math.max(1, currentPage)
  const changed = titleChanged || nextTotal !== totalPages
  const canSave = nextTitle.length > 0 && !duplicate && validPages && changed && !(renameLocked && titleChanged)

  return createPortal(<div className="reading-sheet-backdrop fixed inset-0 z-[150] flex items-end justify-center bg-depot-deep/75 sm:items-center" onPointerDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section role="dialog" aria-modal="true" aria-labelledby="book-edit-sheet-title" data-scroll-lock-allow className="reading-sheet calico-surface max-h-[88svh] w-full max-w-md overflow-y-auto rounded-t-[20px] border border-terracotta/25 p-5 shadow-[0_-16px_42px_rgba(8,43,34,0.28)] sm:rounded-[18px]" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
      <div className="flex items-start justify-between gap-4"><div><h2 id="book-edit-sheet-title" className="text-xl font-extrabold text-terracotta">修改书籍资料</h2><p className="mt-1 text-xs leading-5 text-stone-light">书名修改会同步到已有阅读记录</p></div><button type="button" onClick={onClose} aria-label="关闭书籍修改" className="grid min-h-11 min-w-11 place-items-center rounded-[10px] text-terracotta active:bg-cream-dark"><CloseIcon /></button></div>
      <form className="mt-5 space-y-4" onSubmit={(event) => { event.preventDefault(); if (canSave && onSave(nextTitle, nextTotal)) onClose() }}>
        <label className="block text-sm font-extrabold text-terracotta">书名<input ref={titleRef} value={titleInput} onChange={(event) => setTitleInput(event.target.value.slice(0, 80))} maxLength={80} className="mt-1 min-h-12 w-full rounded-[10px] border border-terracotta/30 bg-calico px-3 text-base font-bold text-depot-ink outline-none focus:border-terracotta focus:bg-white focus:ring-2 focus:ring-chrome-yellow" /></label>
        <label className="block text-sm font-extrabold text-terracotta">总页数<input value={pagesInput} onChange={(event) => setPagesInput(event.target.value.replace(/\D/g, '').slice(0, 5))} inputMode="numeric" pattern="[0-9]*" className="depot-display mt-1 min-h-12 w-full rounded-[10px] border border-terracotta/30 bg-calico px-3 text-lg font-extrabold tabular-nums text-depot-ink outline-none focus:border-terracotta focus:bg-white focus:ring-2 focus:ring-chrome-yellow" /></label>
        <div className="min-h-5" aria-live="polite">{duplicate ? <p className="text-xs font-bold text-[#9d393f]">书架中已经有同名书籍，请换一个名字。</p> : renameLocked && titleChanged ? <p className="text-xs font-bold text-[#9d393f]">这本书仍在计时或等待页码确认，完成后才能改名。</p> : !validPages && pagesInput ? <p className="text-xs font-bold text-[#9d393f]">总页数不能小于当前第 {currentPage} 页。</p> : <p className="text-xs text-stone-light">当前读到第 {currentPage || 0} 页，总页数范围为 1–99,999。</p>}</div>
        <div className="grid grid-cols-2 gap-2 pt-1"><button type="button" onClick={onClose} className="min-h-12 rounded-[10px] border border-terracotta/25 font-bold text-terracotta active:bg-cream-dark">取消</button><button type="submit" disabled={!canSave} className="min-h-12 rounded-[10px] bg-chrome-yellow font-extrabold text-terracotta disabled:cursor-not-allowed disabled:opacity-40 active:bg-[#e8bf00]">保存修改</button></div>
      </form>
    </section>
  </div>, document.body)
}

export function ReadingBookPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const requestedTitle = searchParams.get('title')?.trim() ?? ''
  const {
    records,
    readingBooks,
    setReadingBookTotalPages,
    renameReadingBook,
    updateReadingLogPages,
    deleteReadingLog,
    deleteReadingBook,
  } = useRecords()
  const { sessions, pendingReadingCompletion, start, pushNotice } = useTimer()
  const [activeTab, setActiveTab] = useState<'insights' | 'records'>('insights')
  const [editOpen, setEditOpen] = useState(false)

  const book = readingBooks.find((entry) => entry.title.toLocaleLowerCase() === requestedTitle.toLocaleLowerCase())
  const allReadingSessions = useMemo(() => collectReadingSessions(records), [records])
  const insights = useMemo(
    () => book ? buildReadingBookInsights(allReadingSessions, book.title, book.totalPages) : null,
    [allReadingSessions, book],
  )
  const activeReadingTimer = sessions.find((timer) => timer.completionKind === 'reading')
  const thisBookIsTiming = Boolean(book && activeReadingTimer?.taskName.toLocaleLowerCase() === book.title.toLocaleLowerCase())
  const thisBookNeedsCompletion = Boolean(book && pendingReadingCompletion?.bookTitle.toLocaleLowerCase() === book.title.toLocaleLowerCase())
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
      <button type="button" onClick={() => setEditOpen(true)} className="ml-auto flex min-h-11 shrink-0 items-center gap-1.5 rounded-[10px] px-3 text-sm font-extrabold text-terracotta active:bg-terracotta/8"><EditIcon />修改</button>
    </header>

    <section className="depot-cloth stitched-panel overflow-hidden rounded-[14px] p-4 text-chrome-yellow" aria-labelledby="reading-book-title">
      <div className="flex items-start gap-4">
        <span className={`grid h-24 w-[4.5rem] shrink-0 place-items-center rounded-[8px_14px_14px_8px] shadow-[inset_9px_0_12px_rgba(20,11,2,0.26),0_7px_14px_rgba(5,34,27,0.24)] ${finished ? 'bg-steel text-white' : 'bg-[#e9a62e] text-terracotta'}`}><BookGlyph /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><h1 id="reading-book-title" className="break-words text-2xl font-extrabold leading-tight">{book.title}</h1><span className="rounded-full border border-chrome-yellow/35 px-2 py-0.5 text-[11px] font-extrabold text-chrome-yellow/80">{finished ? '已读完' : '阅读中'}</span></div>
          <p className="mt-2 text-sm font-bold text-chrome-yellow/70">{insights.currentPage ? `第 ${insights.currentPage} / ${book.totalPages} 页` : `尚未开始 · 共 ${book.totalPages} 页`}</p>
        </div>
        <strong className="depot-display shrink-0 text-2xl tabular-nums">{progress}%</strong>
      </div>
      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-black/20"><span className="block h-full rounded-full bg-chrome-yellow" style={{ width: `${progress}%` }} /></div>
      {!finished && <button type="button" onClick={startBook} disabled={Boolean(activeReadingTimer) || Boolean(pendingReadingCompletion)} className="mt-4 min-h-13 w-full rounded-[11px] bg-chrome-yellow px-4 text-base font-extrabold text-terracotta shadow-[0_3px_0_rgba(87,58,0,0.45)] disabled:cursor-not-allowed disabled:opacity-40">{thisBookIsTiming ? '正在阅读' : '开始阅读'}</button>}
    </section>

    <div className="calico-surface stitched-light grid grid-cols-2 gap-1 rounded-[14px] p-1.5" role="tablist" aria-label="书籍详情内容">
      <button type="button" role="tab" aria-selected={activeTab === 'insights'} aria-controls="reading-book-insights" id="reading-book-insights-tab" onClick={() => setActiveTab('insights')} className={`min-h-12 rounded-[10px] text-sm font-extrabold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta ${activeTab === 'insights' ? 'bg-terracotta text-calico' : 'text-terracotta'}`}>数据分析</button>
      <button type="button" role="tab" aria-selected={activeTab === 'records'} aria-controls="reading-book-records" id="reading-book-records-tab" onClick={() => setActiveTab('records')} className={`min-h-12 rounded-[10px] text-sm font-extrabold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta ${activeTab === 'records' ? 'bg-terracotta text-calico' : 'text-terracotta'}`}>阅读记录 <span className="depot-display ml-1 tabular-nums opacity-70">{insights.sessions.length}</span></button>
    </div>

    {activeTab === 'insights' ? <div key="insights" id="reading-book-insights" role="tabpanel" aria-labelledby="reading-book-insights-tab" className="reading-panel-enter">
      <ReadingInsights
        bookTitles={[book.title]}
        selectedTitle={book.title}
        onSelectTitle={() => undefined}
        insights={insights}
        totalPages={book.totalPages}
        onSaveTotalPages={() => undefined}
        showBookSelector={false}
        showBookOverview={false}
      />
    </div> : <div key="records" id="reading-book-records" role="tabpanel" aria-labelledby="reading-book-records-tab" className="reading-panel-enter space-y-3">
      <section className="depot-cloth stitched-panel flex min-h-20 items-center gap-3 rounded-[14px] p-4 text-chrome-yellow" aria-labelledby="book-meta-summary-title">
        <div className="min-w-0 flex-1"><h2 id="book-meta-summary-title" className="truncate text-base font-extrabold">书籍资料</h2><p className="mt-1 truncate text-xs text-chrome-yellow/70">《{book.title}》· 共 {book.totalPages} 页</p></div>
        <button type="button" onClick={() => setEditOpen(true)} className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-[10px] bg-chrome-yellow px-3 text-sm font-extrabold text-terracotta active:bg-[#e8bf00]"><EditIcon />修改</button>
      </section>
      <ReadingRecordManager
        bookTitle={book.title}
        totalPages={book.totalPages}
        sessions={insights.sessions}
        bookActionLocked={thisBookIsTiming || thisBookNeedsCompletion}
        defaultExpanded
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
    </div>}
    <BookEditSheet
      open={editOpen}
      bookTitle={book.title}
      currentPage={insights.currentPage}
      totalPages={book.totalPages}
      allTitles={readingBooks.map((entry) => entry.title)}
      renameLocked={thisBookIsTiming || thisBookNeedsCompletion}
      onClose={() => setEditOpen(false)}
      onSave={(nextTitle, nextTotalPages) => {
        const titleChanged = nextTitle !== book.title
        if (titleChanged && !renameReadingBook(book.title, nextTitle)) {
          pushNotice({ message: '书名修改失败，请检查是否存在同名书籍', type: 'error' })
          return false
        }
        if (nextTotalPages !== book.totalPages) setReadingBookTotalPages(nextTitle, nextTotalPages)
        pushNotice({ message: '书籍资料已更新', type: 'success' })
        if (titleChanged) navigate(`/reading/book?title=${encodeURIComponent(nextTitle)}`, { replace: true })
        return true
      }}
    />
  </div>
}
