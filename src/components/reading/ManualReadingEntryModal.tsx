import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRecords } from '../../context/RecordsContext'
import { useTimer, type PendingReadingLink } from '../../context/TimerContext'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { formatDisplayDate, today } from '../../lib/dateUtils'
import { collectReadingSessions } from '../../lib/readingInsights'

const NEW_BOOK_VALUE = '__new_book__'

interface ManualReadingEntryModalProps {
  open: boolean
  onClose: () => void
  recordedEntry?: PendingReadingLink
}

function digits(value: string, length = 5): string {
  return value.replace(/\D/g, '').slice(0, length)
}

export function ManualReadingEntryModal({ open, onClose, recordedEntry }: ManualReadingEntryModalProps) {
  const { records, readingBooks, addManualReadingSession, linkRecordedReadingSession } = useRecords()
  const { pushNotice } = useTimer()
  const [bookChoice, setBookChoice] = useState(NEW_BOOK_VALUE)
  const [titleInput, setTitleInput] = useState('')
  const [totalPagesInput, setTotalPagesInput] = useState('')
  const [dateInput, setDateInput] = useState(today())
  const [hoursInput, setHoursInput] = useState('0')
  const [minutesInput, setMinutesInput] = useState('')
  const [startPageInput, setStartPageInput] = useState('')
  const [endPageInput, setEndPageInput] = useState('')
  const [error, setError] = useState('')
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  useBodyScrollLock(open, { inertRoot: true, hideRootFromScreenReaders: true })

  const readingSessions = useMemo(() => collectReadingSessions(records), [records])
  const selectedBook = bookChoice === NEW_BOOK_VALUE
    ? undefined
    : readingBooks.find((book) => book.title === bookChoice)
  const suggestedStartPage = useMemo(() => {
    if (!selectedBook) return 1
    const lastPage = readingSessions
      .filter((session) => session.bookTitle.toLocaleLowerCase() === selectedBook.title.toLocaleLowerCase())
      .reduce((maximum, session) => Math.max(maximum, session.endPage ?? 0), 0)
    return Math.min(lastPage + 1, selectedBook.totalPages)
  }, [readingSessions, selectedBook])

  useEffect(() => {
    if (!open) return
    const matchingBook = recordedEntry
      ? readingBooks.find((book) => book.title.toLocaleLowerCase() === recordedEntry.taskName.trim().toLocaleLowerCase())
      : undefined
    const namedUnlistedBook = Boolean(recordedEntry && recordedEntry.taskName.trim() !== '阅读' && !matchingBook)
    const firstBook = matchingBook ?? (namedUnlistedBook ? undefined : readingBooks[0])
    setBookChoice(firstBook?.title ?? NEW_BOOK_VALUE)
    setTitleInput(namedUnlistedBook ? recordedEntry?.taskName ?? '' : '')
    setTotalPagesInput('')
    setDateInput(recordedEntry?.date ?? today())
    setHoursInput('0')
    setMinutesInput(recordedEntry ? String(recordedEntry.minutes % 60) : '')
    setStartPageInput('')
    setEndPageInput('')
    setError('')
    const frame = requestAnimationFrame(() => closeButtonRef.current?.focus({ preventScroll: true }))
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose, readingBooks, recordedEntry])

  useEffect(() => {
    if (!open) return
    setStartPageInput(String(suggestedStartPage))
    setEndPageInput('')
    setError('')
  }, [bookChoice, open, suggestedStartPage])

  if (!open) return null

  const isNewBook = bookChoice === NEW_BOOK_VALUE
  const bookTitle = isNewBook ? titleInput.trim() : selectedBook?.title ?? ''
  const totalPages = isNewBook ? Number(totalPagesInput) : selectedBook?.totalPages ?? 0
  const hours = recordedEntry ? Math.floor(recordedEntry.minutes / 60) : Number(hoursInput || 0)
  const remainingMinutes = Number(minutesInput || 0)
  const durationMinutes = recordedEntry?.minutes ?? hours * 60 + remainingMinutes
  const startPage = Number(startPageInput)
  const endPage = Number(endPageInput)
  const validDuration = Number.isInteger(hours) && hours >= 0 && hours <= 24 &&
    Number.isInteger(remainingMinutes) && remainingMinutes >= 0 && remainingMinutes <= 59 &&
    durationMinutes >= 1 && durationMinutes <= 1_440
  const validBook = bookTitle.length > 0 && Number.isInteger(totalPages) && totalPages >= 1 && totalPages <= 99_999
  const validPages = Number.isInteger(startPage) && startPage >= 1 &&
    Number.isInteger(endPage) && endPage >= startPage && endPage <= totalPages
  const canSave = validBook && validDuration && validPages && dateInput.length === 10 && dateInput <= today()

  const save = (event: React.FormEvent) => {
    event.preventDefault()
    if (!canSave) {
      if (!validBook) setError('请补全书名和总页数')
      else if (!validDuration) setError('阅读时间需在 1 分钟至 24 小时之间')
      else if (!validPages) setError(`页码需在 1–${totalPages || '总页数'} 之间，且结束页不能小于开始页`)
      else setError('请选择今天或更早的日期')
      return
    }
    const result = recordedEntry
      ? linkRecordedReadingSession({
        id: recordedEntry.id,
        bookTitle,
        totalPages,
        date: recordedEntry.date,
        minutes: recordedEntry.minutes,
        startPage,
        endPage,
        completedAt: recordedEntry.completedAt,
      })
      : addManualReadingSession({
        bookTitle,
        totalPages,
        date: dateInput,
        minutes: durationMinutes,
        startPage,
        endPage,
      })
    if (!result.ok) {
      setError(result.message)
      return
    }
    pushNotice({ message: result.message, type: 'success' })
    onClose()
  }

  const inputClass = 'mt-1 min-h-12 w-full rounded-[10px] border border-terracotta/30 bg-calico px-3 text-base font-bold text-depot-ink outline-none focus:ring-2 focus:ring-chrome-yellow'

  return createPortal(
    <div className="reading-sheet-backdrop fixed inset-0 z-[150] flex items-end justify-center bg-depot-deep/75 sm:items-center" onPointerDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section role="dialog" aria-modal="true" aria-labelledby="manual-reading-title" data-scroll-lock-allow className="reading-sheet calico-surface max-h-[92svh] w-full max-w-lg overflow-y-auto rounded-t-[20px] border border-terracotta/25 px-4 pt-4 shadow-[0_-16px_42px_rgba(8,43,34,0.28)] sm:rounded-[18px] sm:p-5" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        <header className="flex items-start justify-between gap-4 border-b border-dashed border-terracotta/25 pb-4">
          <div className="min-w-0">
            <h2 id="manual-reading-title" className="text-xl font-extrabold text-terracotta">{recordedEntry ? '要加入书籍阅读吗？' : '补记一次阅读'}</h2>
            <p className="mt-1 text-xs leading-5 text-stone-light">{recordedEntry ? '时间已经保存；关联书籍不会重复计算分钟' : '同时写入书籍进度、当天阅读时间和统计'}</p>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} className="min-h-11 shrink-0 rounded-[10px] border border-terracotta/25 px-3 text-sm font-extrabold text-terracotta">{recordedEntry ? '暂不关联' : '关闭'}</button>
        </header>

        <form onSubmit={save} className="pt-4">
          {recordedEntry && <div className="mb-4 flex items-center justify-between gap-3 rounded-[12px] bg-terracotta px-4 py-3 text-chrome-yellow">
            <div className="min-w-0"><p className="text-xs font-bold text-chrome-yellow/70">已计入当天阅读</p><p className="mt-0.5 truncate text-sm font-extrabold">{formatDisplayDate(recordedEntry.date)} · {recordedEntry.taskName}</p></div>
            <strong className="depot-display shrink-0 text-2xl tabular-nums">{recordedEntry.minutes} 分</strong>
          </div>}
          <label className="block text-xs font-bold text-terracotta">书籍
            <select value={bookChoice} onChange={(event) => setBookChoice(event.target.value)} className={inputClass}>
              {readingBooks.map((book) => <option key={book.title} value={book.title}>{book.title} · {book.totalPages} 页</option>)}
              <option value={NEW_BOOK_VALUE}>＋ 添加未收录的书</option>
            </select>
          </label>

          {isNewBook && <div className="mt-3 grid grid-cols-[minmax(0,1fr)_7rem] gap-2">
            <label className="min-w-0 text-xs font-bold text-terracotta">书名
              <input value={titleInput} onChange={(event) => { setTitleInput(event.target.value.slice(0, 80)); setError('') }} placeholder="例如：设计心理学" className={inputClass} />
            </label>
            <label className="text-xs font-bold text-terracotta">总页数
              <input value={totalPagesInput} onChange={(event) => { setTotalPagesInput(digits(event.target.value)); setError('') }} inputMode="numeric" placeholder="412" className={`${inputClass} depot-display tabular-nums`} />
            </label>
          </div>}

          {!recordedEntry && <div className="mt-4 border-t border-dashed border-terracotta/20 pt-4">
            <label className="block text-xs font-bold text-terracotta">阅读日期
              <input type="date" value={dateInput} max={today()} onChange={(event) => { setDateInput(event.target.value); setError('') }} className={inputClass} />
            </label>
          </div>}

          {!recordedEntry && <fieldset className="mt-4 border-t border-dashed border-terracotta/20 pt-4">
            <legend className="text-xs font-bold text-terracotta">阅读时长</legend>
            <div className="mt-1 grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
              <input aria-label="阅读小时" value={hoursInput} onChange={(event) => { setHoursInput(digits(event.target.value, 2)); setError('') }} inputMode="numeric" className={`${inputClass} mt-0 text-center depot-display text-xl tabular-nums`} />
              <span className="text-sm font-bold text-stone-light">小时</span>
              <input aria-label="阅读分钟" value={minutesInput} onChange={(event) => { setMinutesInput(digits(event.target.value, 2)); setError('') }} inputMode="numeric" placeholder="30" className={`${inputClass} mt-0 text-center depot-display text-xl tabular-nums`} />
              <span className="text-sm font-bold text-stone-light">分钟</span>
            </div>
          </fieldset>}

          <fieldset className="mt-4 border-t border-dashed border-terracotta/20 pt-4">
            <legend className="text-xs font-bold text-terracotta">阅读页码</legend>
            <div className="mt-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <label className="text-xs font-bold text-stone-light">开始页
                <input value={startPageInput} onChange={(event) => { setStartPageInput(digits(event.target.value)); setError('') }} inputMode="numeric" className={`${inputClass} depot-display text-center text-xl tabular-nums`} />
              </label>
              <span className="pt-5 text-stone-light">到</span>
              <label className="text-xs font-bold text-stone-light">结束页
                <input value={endPageInput} onChange={(event) => { setEndPageInput(digits(event.target.value)); setError('') }} inputMode="numeric" placeholder={totalPages ? `≤ ${totalPages}` : ''} className={`${inputClass} depot-display text-center text-xl tabular-nums`} />
              </label>
            </div>
          </fieldset>

          <div className="min-h-10 pt-2 text-sm font-bold" aria-live="polite">
            {error ? <p className="text-[#9d393f]">{error}</p> : validPages && validDuration ? <p className="text-[#1769d2]">本次 {endPage - startPage + 1} 页 · {durationMinutes} 分钟</p> : <p className="text-stone-light">{recordedEntry ? '选择书籍并填写这次阅读的页码' : '填写实际阅读时间和页码'}</p>}
          </div>

          <button type="submit" disabled={!canSave} className="mt-2 min-h-14 w-full rounded-[12px] bg-chrome-yellow text-base font-extrabold text-terracotta disabled:opacity-40">{recordedEntry ? '加入书籍阅读' : '保存阅读记录'}</button>
        </form>
      </section>
    </div>,
    document.body,
  )
}
