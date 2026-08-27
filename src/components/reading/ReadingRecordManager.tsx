import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { formatDisplayDate, formatMinutes } from '../../lib/dateUtils'
import type { ReadingSessionData } from '../../lib/readingInsights'

type ManagerAction =
  | { kind: 'edit'; session: ReadingSessionData }
  | { kind: 'delete-session'; session: ReadingSessionData }
  | { kind: 'delete-book' }
  | null

interface ReadingRecordManagerProps {
  bookTitle: string
  totalPages: number
  sessions: ReadingSessionData[]
  bookTimerActive: boolean
  onUpdateSession: (session: ReadingSessionData, startPage: number, endPage: number) => void
  onDeleteSession: (session: ReadingSessionData) => void
  onDeleteBook: (deleteHistory: boolean) => void
}

export function ReadingRecordManager({
  bookTitle,
  totalPages,
  sessions,
  bookTimerActive,
  onUpdateSession,
  onDeleteSession,
  onDeleteBook,
}: ReadingRecordManagerProps) {
  const [expanded, setExpanded] = useState(false)
  const [visibleCount, setVisibleCount] = useState(6)
  const [action, setAction] = useState<ManagerAction>(null)
  const [startInput, setStartInput] = useState('')
  const [endInput, setEndInput] = useState('')
  const [deleteHistory, setDeleteHistory] = useState(false)
  const firstButtonRef = useRef<HTMLButtonElement>(null)
  useBodyScrollLock(Boolean(action))

  useEffect(() => {
    if (!action) return
    const frame = requestAnimationFrame(() => firstButtonRef.current?.focus({ preventScroll: true }))
    return () => cancelAnimationFrame(frame)
  }, [action])

  const openEdit = (session: ReadingSessionData) => {
    setStartInput(session.startPage ? String(session.startPage) : '')
    setEndInput(session.endPage ? String(session.endPage) : '')
    setAction({ kind: 'edit', session })
  }
  const startPage = Number(startInput)
  const endPage = Number(endInput)
  const validPages = Number.isInteger(startPage) && startPage >= 1 && Number.isInteger(endPage) && endPage >= startPage && endPage <= totalPages
  const visibleSessions = sessions.slice(0, visibleCount)

  return <>
    <section className="calico-surface stitched-light overflow-hidden rounded-[14px]" aria-labelledby="reading-record-manager-title">
      <button type="button" onClick={() => setExpanded((value) => !value)} className="flex min-h-16 w-full items-center justify-between gap-3 px-4 text-left">
        <span className="min-w-0"><span id="reading-record-manager-title" className="block text-base font-extrabold text-terracotta">阅读记录管理</span><span className="mt-0.5 block text-xs text-stone-light">{sessions.length} 次记录 · 可调整页码或删除</span></span>
        <svg className={`shrink-0 text-terracotta transition-transform ${expanded ? 'rotate-180' : ''}`} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
      </button>

      {expanded && <div className="border-t border-dashed border-terracotta/25 px-3 pb-3 pt-3">
        {sessions.length ? <ol className="space-y-2">
          {visibleSessions.map((session) => <li key={session.id} className="rounded-[10px] border border-terracotta/20 bg-cream p-3">
            <div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-extrabold text-terracotta">{formatDisplayDate(session.date)}</p><p className="mt-1 text-xs font-bold text-stone-light">{session.startPage ?? '—'} – {session.endPage ?? '—'} 页 · {formatMinutes(session.minutes)}</p></div><div className="flex shrink-0 gap-1"><button type="button" onClick={() => openEdit(session)} className="min-h-11 rounded-[8px] px-3 text-xs font-extrabold text-terracotta active:bg-cream-dark">调整页码</button><button type="button" onClick={() => setAction({ kind: 'delete-session', session })} className="min-h-11 rounded-[8px] px-3 text-xs font-extrabold text-[#9d393f] active:bg-[#fff1ed]">删除</button></div></div>
          </li>)}
        </ol> : <p className="rounded-[10px] bg-cream px-4 py-5 text-center text-sm font-bold text-stone-light">这本书还没有阅读记录</p>}
        {visibleCount < sessions.length && <button type="button" onClick={() => setVisibleCount((count) => count + 10)} className="mt-2 min-h-11 w-full text-sm font-bold text-terracotta">再显示 {Math.min(10, sessions.length - visibleCount)} 条</button>}
        <button type="button" onClick={() => setAction({ kind: 'delete-book' })} disabled={bookTimerActive} className="mt-3 min-h-12 w-full rounded-[10px] border border-[#9d393f]/35 text-sm font-extrabold text-[#9d393f] disabled:opacity-40">{bookTimerActive ? '计时中无法删除本书' : '从书架删除这本书'}</button>
      </div>}
    </section>

    {action && createPortal(<div className="fixed inset-0 z-[150] flex items-end justify-center bg-depot-deep/75 sm:items-center" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="reading-manager-dialog-title" data-scroll-lock-allow className="calico-surface w-full max-w-md rounded-t-[20px] border border-terracotta/25 p-5 shadow-[0_-16px_42px_rgba(8,43,34,0.28)] sm:rounded-[18px]" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
        {action.kind === 'edit' ? <form onSubmit={(event) => { event.preventDefault(); if (!validPages) return; onUpdateSession(action.session, startPage, endPage); setAction(null) }}>
          <h2 id="reading-manager-dialog-title" className="text-xl font-extrabold text-terracotta">调整本次页码</h2>
          <p className="mt-1 text-xs leading-5 text-stone-light">{formatDisplayDate(action.session.date)} · 不会改变本次计时</p>
          <div className="mt-4 grid grid-cols-[1fr_1.5rem_1fr] items-end gap-2"><label className="text-xs font-bold text-terracotta">开始页<input value={startInput} onChange={(event) => setStartInput(event.target.value.replace(/\D/g, '').slice(0, 5))} inputMode="numeric" className="depot-display mt-1 min-h-12 w-full rounded-[10px] border border-terracotta/30 bg-calico px-3 text-center text-xl font-extrabold text-terracotta outline-none focus:ring-2 focus:ring-chrome-yellow" /></label><span className="pb-3 text-center text-stone-light">到</span><label className="text-xs font-bold text-terracotta">结束页<input value={endInput} onChange={(event) => setEndInput(event.target.value.replace(/\D/g, '').slice(0, 5))} inputMode="numeric" className="depot-display mt-1 min-h-12 w-full rounded-[10px] border border-terracotta/30 bg-calico px-3 text-center text-xl font-extrabold text-terracotta outline-none focus:ring-2 focus:ring-chrome-yellow" /></label></div>
          {!validPages && (startInput || endInput) && <p className="mt-2 text-xs font-bold text-[#9d393f]">页码需在 1–{totalPages} 之间，且结束页不得小于开始页。</p>}
          <div className="mt-5 grid grid-cols-2 gap-2"><button ref={firstButtonRef} type="button" onClick={() => setAction(null)} className="min-h-12 rounded-[10px] border border-terracotta/25 font-bold text-terracotta">取消</button><button type="submit" disabled={!validPages} className="min-h-12 rounded-[10px] bg-chrome-yellow font-extrabold text-terracotta disabled:opacity-40">保存页码</button></div>
        </form> : action.kind === 'delete-session' ? <div>
          <h2 id="reading-manager-dialog-title" className="text-xl font-extrabold text-terracotta">删除这次阅读？</h2><p className="mt-2 text-sm leading-6 text-stone-light">{formatDisplayDate(action.session.date)} 的 {action.session.startPage}–{action.session.endPage} 页与 {formatMinutes(action.session.minutes)} 将一起从统计中扣除。</p><div className="mt-5 grid grid-cols-2 gap-2"><button ref={firstButtonRef} type="button" onClick={() => setAction(null)} className="min-h-12 rounded-[10px] border border-terracotta/25 font-bold text-terracotta">取消</button><button type="button" onClick={() => { onDeleteSession(action.session); setAction(null) }} className="min-h-12 rounded-[10px] bg-[#9d393f] font-extrabold text-white">确认删除</button></div>
        </div> : <div>
          <h2 id="reading-manager-dialog-title" className="text-xl font-extrabold text-terracotta">从书架删除《{bookTitle}》？</h2><p className="mt-2 text-sm leading-6 text-stone-light">默认只删除书籍资料，已有阅读历史仍保留在备份与统计数据中。</p><label className="mt-4 flex min-h-14 items-center gap-3 rounded-[10px] border border-[#9d393f]/25 bg-[#fff5ef] px-3 text-sm font-bold text-[#7f352f]"><input type="checkbox" checked={deleteHistory} onChange={(event) => setDeleteHistory(event.target.checked)} className="h-5 w-5 accent-[#9d393f]" />同时删除这本书的 {sessions.length} 条阅读记录</label><div className="mt-5 grid grid-cols-2 gap-2"><button ref={firstButtonRef} type="button" onClick={() => { setDeleteHistory(false); setAction(null) }} className="min-h-12 rounded-[10px] border border-terracotta/25 font-bold text-terracotta">取消</button><button type="button" onClick={() => { onDeleteBook(deleteHistory); setDeleteHistory(false); setAction(null) }} className="min-h-12 rounded-[10px] bg-[#9d393f] font-extrabold text-white">删除书籍</button></div>
        </div>}
      </section>
    </div>, document.body)}
  </>
}
