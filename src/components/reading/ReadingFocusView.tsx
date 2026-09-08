import { createPortal } from 'react-dom'
import { useMemo } from 'react'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { useRecords } from '../../context/RecordsContext'
import { useTimer } from '../../context/TimerContext'
import { buildReadingBookInsights, collectReadingSessions } from '../../lib/readingInsights'
import { formatElapsed, getDisplayMs } from '../../lib/timerStorage'

/** 书架阅读的专注模式：计时期间不显示底部导航，避免误触和布局抖动。 */
export function ReadingFocusView() {
  const { records, readingBooks } = useRecords()
  const { sessions, now, pendingReadingCompletion, pause, resume, stop } = useTimer()
  const timer = sessions.find((item) => item.completionKind === 'reading') ?? null
  useBodyScrollLock(Boolean(timer && !pendingReadingCompletion), {
    inertRoot: true,
    hideRootFromScreenReaders: true,
  })

  const book = timer
    ? readingBooks.find((item) => item.title.toLocaleLowerCase() === timer.taskName.toLocaleLowerCase())
    : undefined
  const insights = useMemo(() => timer
    ? buildReadingBookInsights(collectReadingSessions(records), timer.taskName, book?.totalPages)
    : null, [book?.totalPages, records, timer])

  if (!timer || pendingReadingCompletion) return null
  const paused = timer.status === 'paused'
  const currentPage = insights?.currentPage ?? 0

  return createPortal(
    <section
      className="fixed inset-0 z-[130] flex min-h-svh flex-col overflow-hidden bg-[#111319] text-[#f3f4f7]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reading-focus-title"
      data-scroll-lock-allow
    >
      <div className="absolute inset-x-0 top-0 h-52 bg-[radial-gradient(circle_at_50%_0%,rgba(47,132,255,0.22),transparent_72%)]" aria-hidden />
      <header className="relative flex shrink-0 items-center justify-between px-5 pb-3" style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-white/55">书籍阅读</span>
        <span className={`flex items-center gap-2 text-xs font-bold ${paused ? 'text-white/50' : 'text-[#63a4ff]'}`}>
          <span className={`h-2 w-2 rounded-full ${paused ? 'bg-white/35' : 'bg-[#4b95ff]'}`} />
          {paused ? '已暂停' : '专注中'}
        </span>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-6 pb-8 text-center">
        <p className="mb-5 text-sm font-bold text-white/46">
          {currentPage > 0 ? `上次读到第 ${currentPage} 页` : '这是第一次阅读'}
          {book ? ` · 共 ${book.totalPages} 页` : ''}
        </p>
        <div className="relative grid aspect-[4/5] w-[min(48vw,13rem)] place-items-center overflow-hidden rounded-[10px_22px_22px_10px] border border-[#f3b83a]/35 bg-[linear-gradient(135deg,#bd7c14,#f3a923_52%,#ce8614)] shadow-[inset_12px_0_18px_rgba(65,35,3,0.35),0_24px_60px_rgba(0,0,0,0.35)]" aria-hidden>
          <span className="absolute inset-y-0 left-3 w-px bg-white/25" />
          <span className="max-w-[80%] text-2xl font-black leading-tight text-white drop-shadow-sm">《{timer.taskName}》</span>
        </div>
        <h2 id="reading-focus-title" className="mt-6 max-w-full truncate text-xl font-extrabold text-white">{timer.taskName}</h2>
        <p className="mt-3 font-mono text-[clamp(4rem,18vw,7.5rem)] font-light leading-none tracking-[-0.07em] tabular-nums text-[#e9ebf2]">
          {formatElapsed(getDisplayMs(timer, now))}
        </p>
      </div>

      <div className="relative grid shrink-0 grid-cols-2 gap-8 px-[12vw] pb-6" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
        <button
          type="button"
          onClick={() => paused ? resume(timer.id) : pause(timer.id)}
          className="mx-auto flex h-24 w-24 flex-col items-center justify-center gap-2 rounded-full bg-[#4a72c5] text-white shadow-[0_12px_28px_rgba(35,77,160,0.3)] active:scale-[0.97]"
        >
          {paused ? <svg width="27" height="27" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="m8 5 11 7-11 7V5Z" /></svg> : <svg width="27" height="27" viewBox="0 0 24 24" fill="currentColor" aria-hidden><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>}
          <span className="text-xs font-extrabold">{paused ? '继续' : '暂停'}</span>
        </button>
        <button
          type="button"
          onClick={() => stop(timer.id)}
          className="mx-auto flex h-24 w-24 flex-col items-center justify-center gap-2 rounded-full bg-[#f14272] text-white shadow-[0_12px_32px_rgba(241,66,114,0.28)] active:scale-[0.97]"
        >
          <span className="h-7 w-7 rounded-[6px] bg-[#12141a]" aria-hidden />
          <span className="text-xs font-extrabold">结束阅读</span>
        </button>
      </div>
    </section>,
    document.body,
  )
}
