import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { useRecords } from '../../context/RecordsContext'
import { useTimer } from '../../context/TimerContext'
import { countReadingPages } from '../../lib/readingLogs'
import { formatDisplayDate } from '../../lib/dateUtils'

function pageValue(raw: string): number | null {
  if (!raw) return null
  const value = Number(raw)
  return Number.isInteger(value) && value >= 1 ? value : null
}

/** 阅读计时的必经收尾：先结束计时，再填写本次读到哪里。 */
export function ReadingCompletionModal() {
  const { records } = useRecords()
  const {
    pendingReadingCompletion,
    completeReading,
    discardReadingCompletion,
  } = useTimer()
  const [startInput, setStartInput] = useState('')
  const [endInput, setEndInput] = useState('')
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const startRef = useRef<HTMLInputElement>(null)
  const discardButtonRef = useRef<HTMLButtonElement>(null)
  const returnButtonRef = useRef<HTMLButtonElement>(null)
  const previousConfirmDiscardRef = useRef(false)

  useBodyScrollLock(Boolean(pendingReadingCompletion))

  const suggestedStart = useMemo(() => {
    if (!pendingReadingCompletion) return null
    const matches = records
      .flatMap((record) => record.readingLogs ?? [])
      .filter((entry) => (
        entry.bookTitle.trim() === pendingReadingCompletion.bookTitle &&
        entry.endPage != null
      ))
      .sort((a, b) => (a.completedAt ?? '').localeCompare(b.completedAt ?? ''))
    const latest = matches.at(-1)
    return latest?.endPage ? latest.endPage + 1 : null
  }, [pendingReadingCompletion, records])

  useEffect(() => {
    if (!pendingReadingCompletion) return
    setStartInput(suggestedStart ? String(suggestedStart) : '')
    setEndInput('')
    setConfirmDiscard(false)
    const frame = window.requestAnimationFrame(() => startRef.current?.focus({ preventScroll: true }))
    return () => window.cancelAnimationFrame(frame)
  }, [pendingReadingCompletion, suggestedStart])

  useEffect(() => {
    if (!pendingReadingCompletion) return
    const appRoot = document.getElementById('root')
    const previousAriaHidden = appRoot?.getAttribute('aria-hidden')
    if (appRoot) {
      appRoot.setAttribute('inert', '')
      appRoot.setAttribute('aria-hidden', 'true')
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ))
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (appRoot) {
        appRoot.removeAttribute('inert')
        if (previousAriaHidden == null) appRoot.removeAttribute('aria-hidden')
        else appRoot.setAttribute('aria-hidden', previousAriaHidden)
      }
      window.requestAnimationFrame(() => {
        const destination = document.getElementById('reading-book-input')
          ?? document.getElementById('app-page-title')
        destination?.focus({ preventScroll: true })
      })
    }
  }, [pendingReadingCompletion])

  useEffect(() => {
    if (!pendingReadingCompletion) return
    if (confirmDiscard) {
      returnButtonRef.current?.focus({ preventScroll: true })
    } else if (previousConfirmDiscardRef.current) {
      discardButtonRef.current?.focus({ preventScroll: true })
    }
    previousConfirmDiscardRef.current = confirmDiscard
  }, [confirmDiscard, pendingReadingCompletion])

  if (!pendingReadingCompletion) return null

  const startPage = pageValue(startInput)
  const endPage = pageValue(endInput)
  const reversed = startPage != null && endPage != null && endPage < startPage
  const pages = startPage != null && endPage != null && !reversed
    ? countReadingPages({
        id: pendingReadingCompletion.id,
        bookTitle: pendingReadingCompletion.bookTitle,
        startPage,
        endPage,
      })
    : 0
  const canSave = pages > 0

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (startPage == null || endPage == null || !canSave) return
    completeReading(startPage, endPage)
  }

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center" role="presentation">
      <div className="absolute inset-0 bg-depot-deep/72" aria-hidden />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reading-complete-title"
        data-scroll-lock-allow
        className="calico-surface relative z-10 flex max-h-[min(92dvh,100%)] w-full max-w-md flex-col overflow-hidden rounded-t-[20px] border border-terracotta/30 shadow-[0_-18px_48px_rgba(8,43,34,0.34)] sm:rounded-[18px]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex justify-center pt-2 sm:hidden" aria-hidden>
          <span className="h-1 w-10 rounded-full bg-terracotta/35" />
        </div>

        <div className="depot-cloth shrink-0 border-b border-chrome-yellow/35 px-5 pb-4 pt-3 sm:pt-5">
          <p className="text-xs font-bold text-chrome-yellow/75">计时已结束 · {formatDisplayDate(pendingReadingCompletion.date)}</p>
          <h2 id="reading-complete-title" className="mt-1 truncate text-xl font-extrabold text-chrome-yellow">
            {pendingReadingCompletion.bookTitle}
          </h2>
          <p className="depot-display mt-3 text-4xl font-extrabold tabular-nums text-chrome-yellow">
            {pendingReadingCompletion.minutes > 0 ? pendingReadingCompletion.minutes : '<1'}<span className="ml-1 text-lg">分钟</span>
          </p>
        </div>

        <form
          onSubmit={submit}
          data-scroll-lock-allow
          className="scroll-region min-h-0 flex-1 overflow-y-auto overscroll-none px-5 py-5"
        >
          <div>
            <h3 className="text-base font-extrabold text-terracotta">这次读了哪几页？</h3>
            <p className="mt-1 text-xs leading-5 text-stone-light">
              填写结束后再保存，页数和阅读时间会一起同步到今日页面。
            </p>
          </div>

          <div className="mt-4 grid grid-cols-[minmax(0,1fr)_1.5rem_minmax(0,1fr)] items-end gap-2">
            <label className="min-w-0 text-xs font-bold text-terracotta">
              起始页
              <input
                ref={startRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={startInput}
                onChange={(event) => setStartInput(event.target.value.replace(/\D/g, '').slice(0, 5))}
                placeholder="例如 32"
                className="depot-display mt-1 min-h-12 w-full rounded-[10px] border border-terracotta/30 bg-calico px-3 text-center text-xl font-extrabold tabular-nums text-terracotta placeholder:font-sans placeholder:text-sm placeholder:font-medium placeholder:text-stone-light focus:border-terracotta focus:bg-white focus:outline-none focus:ring-2 focus:ring-chrome-yellow/60"
              />
            </label>
            <span className="pb-3 text-center text-sm font-bold text-stone-light" aria-hidden>到</span>
            <label className="min-w-0 text-xs font-bold text-terracotta">
              结束页
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={endInput}
                onChange={(event) => setEndInput(event.target.value.replace(/\D/g, '').slice(0, 5))}
                placeholder="例如 48"
                className="depot-display mt-1 min-h-12 w-full rounded-[10px] border border-terracotta/30 bg-calico px-3 text-center text-xl font-extrabold tabular-nums text-terracotta placeholder:font-sans placeholder:text-sm placeholder:font-medium placeholder:text-stone-light focus:border-terracotta focus:bg-white focus:outline-none focus:ring-2 focus:ring-chrome-yellow/60"
              />
            </label>
          </div>

          <div className="mt-3 min-h-10 rounded-[10px] border border-dashed border-terracotta/25 bg-cream px-3 py-2" aria-live="polite">
            <p className={`text-xs font-bold ${reversed ? 'text-[#923d36]' : 'text-terracotta'}`}>
              {reversed
                ? '结束页不能小于起始页，请检查页码'
                : pages > 0
                  ? `本次共阅读 ${pages} 页（包含首尾页）`
                  : suggestedStart
                    ? `已根据上次进度建议从第 ${suggestedStart} 页开始`
                    : '输入起始页和结束页后即可保存'}
            </p>
          </div>

          <button
            type="submit"
            disabled={!canSave}
            className="mt-4 min-h-12 w-full rounded-[10px] bg-chrome-yellow px-4 text-base font-extrabold text-terracotta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta disabled:cursor-not-allowed disabled:opacity-40 active:bg-[#e8bf00]"
          >
            保存本次阅读
          </button>

          {!confirmDiscard ? (
            <button
              ref={discardButtonRef}
              type="button"
              onClick={() => setConfirmDiscard(true)}
              className="mt-2 min-h-11 w-full text-xs font-bold text-stone-light active:text-terracotta"
            >
              删除这次计时
            </button>
          ) : (
            <div className="mt-3 rounded-[10px] border border-[#923d36]/35 bg-[#fff5ef] p-3">
              <p className="text-xs font-bold text-[#7f352f]">这次时间和页码都不会保存。</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button ref={returnButtonRef} type="button" onClick={() => setConfirmDiscard(false)} className="min-h-11 rounded-[8px] border border-terracotta/25 text-sm font-bold text-terracotta">返回填写</button>
                <button type="button" onClick={discardReadingCompletion} className="min-h-11 rounded-[8px] bg-[#923d36] text-sm font-bold text-white">确认删除</button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>,
    document.body,
  )
}
