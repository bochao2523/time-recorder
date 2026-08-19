import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageCard } from '../components/layout/Layout'
import { DatePicker } from '../components/common/DatePicker'
import { CategoryInput } from '../components/common/CategoryInput'
import { useRecords } from '../context/RecordsContext'
import { useTimer } from '../context/TimerContext'
import {
  type Category,
  type CategorySubItem,
  type CategorySubItems,
} from '../types'
import {
  buildRecordFromForm,
  createEmptySubItems,
  isSameFormAsRecord,
  subItemsFromRecord,
  sumSubItemMinutes,
} from '../lib/categoryItems'
import { formatDisplayDate, formatMinutes, today } from '../lib/dateUtils'
import { formatElapsed } from '../lib/timerStorage'
import { useCategories } from '../context/useCategories'

const AUTO_SAVE_DELAY_MS = 600
const SAVED_HINT_DURATION_MS = 3000

type SaveStatus = 'idle' | 'pending' | 'saved'

function SaveStatusBadge({ status }: { status: SaveStatus }) {
  return (
    <div
      className={`stable-status-slot flex shrink-0 items-center justify-center gap-1.5 rounded-[10px] border px-2 text-xs font-bold ${
        status === 'saved'
          ? 'border-terracotta/30 bg-terracotta text-chrome-yellow'
          : status === 'pending'
            ? 'border-terracotta/25 bg-calico text-terracotta'
            : 'invisible border-transparent'
      }`}
      aria-live="polite"
      aria-hidden={status === 'idle'}
    >
      {status === 'saved' ? <>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <polyline points="20 6 9 17 4 12" />
        </svg>
        已保存
      </> : status === 'pending' ? <>
        <span className="h-2 w-2 rounded-full bg-amber" aria-hidden />
        保存中
      </> : '已保存'}
    </div>
  )
}

export function TodayPage() {
  const [searchParams] = useSearchParams()
  const { records, getRecordByDate, upsertRecord, deleteRecord } = useRecords()
  const { session, displayMs, start, openModal, pause, resume, pushNotice } = useTimer()
  const { activeCategories, getCategory } = useCategories()

  const initialDate = searchParams.get('date') ?? today()
  const [selectedDate, setSelectedDate] = useState(initialDate)
  const [subItems, setSubItems] = useState<CategorySubItems>(createEmptySubItems())
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const manualEntryRef = useRef<HTMLDivElement>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveStatusRef = useRef(saveStatus)
  saveStatusRef.current = saveStatus
  const selectedDateRef = useRef(selectedDate)

  // URL 参数变化时同步日期
  useEffect(() => {
    const d = searchParams.get('date')
    if (d) setSelectedDate(d)
  }, [searchParams])

  // 切换日期时回填；计时结束后 records 变化时也同步（编辑 pending 时不覆盖）
  useEffect(() => {
    const dateChanged = selectedDateRef.current !== selectedDate
    selectedDateRef.current = selectedDate
    if (!dateChanged && saveStatusRef.current === 'pending') return

    const existing = getRecordByDate(selectedDate)
    if (existing) {
      setSubItems(subItemsFromRecord(existing))
    } else {
      setSubItems(createEmptySubItems())
    }
    setSaveStatus('idle')
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 依赖 records / selectedDate
  }, [selectedDate, records])

  const total = useMemo(() => {
    return sumSubItemMinutes(
      Object.values(subItems).flatMap((items) => items ?? []),
    )
  }, [subItems])

  const handleSubItemsChange = useCallback((cat: Category, items: CategorySubItems[Category]) => {
    setSubItems((prev) => ({ ...prev, [cat]: items ?? [] }))
    setSaveStatus('pending')
  }, [])

  /** 已有小类旁快捷正计时：同名累加记入 */
  const handleQuickTimer = useCallback(
    (cat: Category, item: CategorySubItem) => {
      const name = item.name.trim()
      if (!name) {
        pushNotice({ message: '先填写任务名称', type: 'error' })
        return
      }

      if (
        session &&
        session.category === cat &&
        session.taskName.trim() === name
      ) {
        openModal()
        return
      }

      if (session) {
        pushNotice({
          message: `「${session.taskName}」正在计时`,
          type: 'error',
        })
        openModal()
        return
      }

      const ok = start(name, cat, { date: selectedDate, mode: 'stopwatch' })
      if (!ok) {
        pushNotice({ message: '计时未开始，请重试', type: 'error' })
        return
      }
      openModal()
    },
    [session, start, openModal, pushNotice, selectedDate],
  )

  const handleManualEntry = useCallback(() => {
    const target = manualEntryRef.current
    if (!target) return
    target.scrollIntoView({ block: 'start' })
    const firstInput = target.querySelector<HTMLInputElement>('input')
    if (!firstInput) {
      target.querySelector<HTMLButtonElement>('button[aria-expanded="false"]')?.click()
    }
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        target.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true })
      })
    })
  }, [])

  const markSaved = useCallback(() => {
    setSaveStatus('saved')
  }, [])

  // 输入变更后自动保存（防抖）
  useEffect(() => {
    const timer = setTimeout(() => {
      const pending = buildRecordFromForm(selectedDate, subItems)
      const existing = getRecordByDate(selectedDate)

      if (!pending) {
        if (existing) {
          deleteRecord(selectedDate)
          markSaved()
        } else {
          setSaveStatus('idle')
        }
        return
      }

      if (existing && isSameFormAsRecord(selectedDate, subItems, existing)) {
        setSaveStatus('idle')
        return
      }

      upsertRecord(pending)
      markSaved()
    }, AUTO_SAVE_DELAY_MS)

    return () => clearTimeout(timer)
  }, [subItems, selectedDate, getRecordByDate, upsertRecord, deleteRecord, markSaved])

  // 「已保存」提示短暂显示后恢复
  useEffect(() => {
    if (saveStatus !== 'saved') return
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    savedTimerRef.current = setTimeout(() => {
      setSaveStatus('idle')
    }, SAVED_HINT_DURATION_MS)
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [saveStatus])

  return (
    <div className="no-layout-animation space-y-3">
      <PageCard className="p-3.5 sm:p-4">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0 flex-1">
            <DatePicker value={selectedDate} onChange={setSelectedDate} max={today()} />
            <p
              className={`mt-2 min-h-5 text-xs font-medium text-stone-light ${selectedDate === today() ? 'invisible' : ''}`}
              aria-hidden={selectedDate === today()}
            >
              {selectedDate === today() ? '当前日期' : `正在编辑 ${formatDisplayDate(selectedDate)}`}
            </p>
          </div>
          <SaveStatusBadge status={saveStatus} />
        </div>
      </PageCard>

      <section className="depot-cloth stitched-panel overflow-hidden rounded-[14px] p-4 sm:p-5" aria-labelledby="today-total-title">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p id="today-total-title" className="depot-display text-sm font-extrabold tracking-[0.08em] text-chrome-yellow/85">
              {selectedDate === today() ? '今日已记录' : formatDisplayDate(selectedDate)}
            </p>
            <p className="depot-display mt-1 whitespace-nowrap text-[2.7rem] font-extrabold leading-none tracking-[-0.02em] text-chrome-yellow sm:text-5xl">
              {total > 0 ? formatMinutes(total) : '0 分钟'}
            </p>
          </div>
          <div className="grid shrink-0 grid-cols-2 gap-x-3 text-right text-[10px] font-bold leading-tight text-chrome-yellow/75 sm:text-xs">
            <span>记录</span><span>{Object.values(subItems).flatMap((items) => items ?? []).filter((item) => item.minutes > 0).length} 项</span>
            <span>状态</span><span>{session ? '计时中' : '待开始'}</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5 border-t border-chrome-yellow/35 pt-4">
          <button
            type="button"
            onClick={handleManualEntry}
            className="calico-surface stitched-light flex min-h-[5.5rem] flex-col items-center justify-center gap-2 rounded-[12px] px-3 text-sm font-extrabold text-terracotta active:bg-cream-dark"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" /></svg>
            <span className="leading-tight">手动记录<span className="mt-1 block text-xs font-semibold text-stone-light">填写已经花掉的时间</span></span>
          </button>
          <button
            type="button"
            onClick={openModal}
            className="calico-surface stitched-light flex min-h-[5.5rem] flex-col items-center justify-center gap-2 rounded-[12px] px-3 text-sm font-extrabold text-terracotta active:bg-cream-dark"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="9" /><path d="m10 8 6 4-6 4V8Z" /></svg>
            <span className="leading-tight">开始计时<span className="mt-1 block text-xs font-semibold text-stone-light">从现在开始自动累计</span></span>
          </button>
        </div>
      </section>

      <section className="depot-cloth stitched-panel flex min-h-[5.5rem] items-center gap-3 overflow-hidden rounded-[14px] px-4 py-3" aria-label="当前计时">
        <div className="min-w-0 flex-1">
          <p className="depot-display text-xs font-extrabold tracking-[0.08em] text-chrome-yellow/80">
            {session ? `${session.status === 'paused' ? '已暂停' : '正在计时'} · ${getCategory(session.category).label}` : '当前没有计时'}
          </p>
          <p className="mt-1 truncate text-base font-bold text-chrome-yellow">
            {session?.taskName ?? '选择任务后开始一段专注时间'}
          </p>
        </div>
        <p className="stable-timer-slot depot-display shrink-0 text-right text-2xl font-extrabold tracking-[0.04em] text-chrome-yellow">
          {session ? formatElapsed(displayMs) : '00:00:00'}
        </p>
        <button
          type="button"
          onClick={session ? (session.status === 'paused' ? resume : pause) : openModal}
          aria-label={session ? (session.status === 'paused' ? '继续计时' : '暂停计时') : '开始计时'}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] border border-chrome-yellow/65 text-chrome-yellow active:bg-chrome-yellow active:text-terracotta"
        >
          {session?.status === 'paused' || !session ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="m8 5 11 7-11 7V5Z" /></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>
          )}
        </button>
      </section>

      <div ref={manualEntryRef} id="manual-entry" className="space-y-2.5 scroll-mt-24">
        <div className="flex items-center gap-2 px-1 pb-0.5 pt-1">
          <span className="depot-eyelet" aria-hidden />
          <h2 className="text-base font-extrabold text-terracotta">任务记录</h2>
          <p className="ml-auto text-xs font-medium text-stone-light">修改后自动保存</p>
        </div>
        {activeCategories.map((definition) => (
          <CategoryInput
            key={definition.id}
            definition={definition}
            items={subItems[definition.id] ?? []}
            onChange={(items) => handleSubItemsChange(definition.id, items)}
            onQuickTimer={(item) => handleQuickTimer(definition.id, item)}
            activeTaskName={
              session?.category === definition.id ? session.taskName : null
            }
          />
        ))}
      </div>
    </div>
  )
}
