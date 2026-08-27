import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { useRecords } from '../../context/RecordsContext'
import { useTimer } from '../../context/TimerContext'
import { collectReadingSessions } from '../../lib/readingInsights'
import { formatDisplayDate } from '../../lib/dateUtils'

function integer(raw: string): number | null {
  const value = Number(raw)
  return raw && Number.isInteger(value) && value >= 1 ? value : null
}

/** 专属书籍计时的第二步：结束后才强制录入页码。 */
export function ReadingCompletionModal() {
  const { records, readingBooks } = useRecords()
  const { pendingReadingCompletion, completeReading, discardReadingCompletion } = useTimer()
  const [endInput, setEndInput] = useState('')
  const [finished, setFinished] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  useBodyScrollLock(Boolean(pendingReadingCompletion))

  const book = pendingReadingCompletion
    ? readingBooks.find((item) => item.title.toLocaleLowerCase() === pendingReadingCompletion.bookTitle.toLocaleLowerCase())
    : undefined
  const suggestedStart = useMemo(() => {
    if (!pendingReadingCompletion) return 1
    const lastPage = collectReadingSessions(records)
      .filter((entry) => entry.bookTitle.toLocaleLowerCase() === pendingReadingCompletion.bookTitle.toLocaleLowerCase())
      .reduce((max, entry) => Math.max(max, entry.endPage ?? 0), 0)
    return Math.min((lastPage || 0) + 1, book?.totalPages ?? Number.MAX_SAFE_INTEGER)
  }, [book?.totalPages, pendingReadingCompletion, records])

  useEffect(() => {
    if (!pendingReadingCompletion) return
    setEndInput('')
    setFinished(false)
    setConfirmDiscard(false)
    const frame = requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }))
    return () => cancelAnimationFrame(frame)
  }, [pendingReadingCompletion])

  useEffect(() => {
    if (!pendingReadingCompletion) return
    const root = document.getElementById('root')
    root?.setAttribute('inert', '')
    return () => root?.removeAttribute('inert')
  }, [pendingReadingCompletion])

  if (!pendingReadingCompletion) return null
  const endPage = integer(endInput)
  const exceedsTotal = Boolean(endPage && book && endPage > book.totalPages)
  const beforeStart = Boolean(endPage && endPage < suggestedStart)
  const canSave = endPage != null && !exceedsTotal && !beforeStart
  const pageCount = canSave && endPage ? endPage - suggestedStart + 1 : 0

  return createPortal(
    <section className="fixed inset-0 z-[140] flex min-h-svh flex-col overflow-y-auto bg-[#1d1f20] text-[#e8e9ee]" role="dialog" aria-modal="true" aria-labelledby="reading-finish-title" data-scroll-lock-allow>
      <header className="flex items-center justify-between px-5 pb-4" style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}>
        <div>
          <p className="text-xs font-bold text-white/45">{formatDisplayDate(pendingReadingCompletion.date)} · 阅读结束</p>
          <h2 id="reading-finish-title" className="mt-1 max-w-[70vw] truncate text-2xl font-extrabold">{pendingReadingCompletion.bookTitle}</h2>
        </div>
        <button type="button" onClick={() => setConfirmDiscard(true)} className="min-h-11 rounded-full px-3 text-sm font-extrabold text-[#ff4d80]">删除计时</button>
      </header>

      <form className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-8" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }} onSubmit={(event) => {
        event.preventDefault()
        if (canSave && endPage) completeReading(suggestedStart, endPage)
      }}>
        <p className="mt-3 text-sm leading-6 text-white/55">只有从书架开始的阅读需要页码，用于计算这本书的真实进度。</p>

        <div className="mt-7 overflow-hidden rounded-[20px] border border-white/8 bg-[#101116]">
          <div className="flex min-h-20 items-center justify-between border-b border-white/8 px-5"><span className="font-bold text-white/60">阅读时间</span><span className="font-mono text-2xl font-bold tabular-nums">{pendingReadingCompletion.minutes > 0 ? `${pendingReadingCompletion.minutes} 分钟` : '不足 1 分钟'}</span></div>
          <div className="flex min-h-20 items-center justify-between border-b border-white/8 px-5"><span className="font-bold text-white/60">开始页</span><span className="font-mono text-2xl font-bold tabular-nums">{suggestedStart}</span></div>
          <label className="flex min-h-24 items-center justify-between gap-5 px-5">
            <span className="shrink-0 font-bold text-white/75">结束页</span>
            <input ref={inputRef} type="text" inputMode="numeric" pattern="[0-9]*" value={endInput} onChange={(event) => { setEndInput(event.target.value.replace(/\D/g, '').slice(0, 5)); setFinished(false) }} placeholder={book ? `最多 ${book.totalPages}` : '输入页码'} className="min-h-14 min-w-0 flex-1 bg-transparent text-right font-mono text-3xl font-bold tabular-nums text-white outline-none placeholder:text-lg placeholder:text-white/22" />
          </label>
        </div>

        <label className="mt-5 flex min-h-14 items-center gap-3 rounded-[14px] border border-white/10 bg-white/[0.035] px-4 text-base font-bold">
          <input type="checkbox" checked={finished} onChange={(event) => { const checked = event.target.checked; setFinished(checked); if (checked && book) setEndInput(String(book.totalPages)) }} disabled={!book} className="h-6 w-6 accent-[#4b8df8]" />
          本书已读完
          {book && <span className="ml-auto text-sm text-white/40">共 {book.totalPages} 页</span>}
        </label>

        <div className="min-h-14 px-1 pt-3 text-sm font-bold" aria-live="polite">
          {exceedsTotal ? <p className="text-[#ff7098]">不能超过本书总页数 {book?.totalPages}</p> : beforeStart ? <p className="text-[#ff7098]">结束页不能小于开始页 {suggestedStart}</p> : pageCount > 0 ? <p className="text-[#75a9ff]">本次阅读 {pageCount} 页</p> : <p className="text-white/35">输入这次最后读到的页码</p>}
        </div>
        <button type="submit" disabled={!canSave} className="mt-auto min-h-16 w-full rounded-full bg-[#4775ca] text-xl font-extrabold text-white disabled:opacity-35 active:scale-[0.99]">保存本次阅读</button>
      </form>

      {confirmDiscard && <div className="fixed inset-0 z-10 grid place-items-end bg-black/65 p-4 sm:place-items-center"><div className="w-full max-w-sm rounded-[20px] bg-[#292b30] p-5 shadow-2xl"><h3 className="text-lg font-extrabold">删除这次计时？</h3><p className="mt-2 text-sm leading-6 text-white/55">时间和页码都不会保存。</p><div className="mt-5 grid grid-cols-2 gap-3"><button type="button" onClick={() => setConfirmDiscard(false)} className="min-h-12 rounded-[12px] bg-white/8 font-bold">返回</button><button type="button" onClick={discardReadingCompletion} className="min-h-12 rounded-[12px] bg-[#f14272] font-extrabold text-white">确认删除</button></div></div></div>}
    </section>, document.body,
  )
}
