import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
import {
  formatElapsed,
  getDisplayMs,
  getSessionTargets,
} from '../lib/timerStorage'
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
            : 'border-terracotta/22 bg-calico text-terracotta'
      }`}
      aria-live="polite"
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

function formatCategoryDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return `${hours}:${String(remainder).padStart(2, '0')}`
}

function formatSummaryTotal(minutes: number): string {
  if (minutes <= 0) return '0分钟'
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  if (hours === 0) return `${remainder}分钟`
  if (remainder === 0) return `${hours}小时`
  return `${hours}小时${remainder}分`
}

export function TodayPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { records, getRecordByDate, upsertRecord, deleteRecord } = useRecords()
  const { sessions, now, start, openModal, pushNotice } = useTimer()
  const { activeCategories, getCategory } = useCategories()

  const initialDate = searchParams.get('date') ?? today()
  const [selectedDate, setSelectedDate] = useState(initialDate)
  const [subItems, setSubItems] = useState<CategorySubItems>(createEmptySubItems())
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
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

  const summaryCategories = useMemo(() => {
    const activeIds = new Set(activeCategories.map((category) => category.id))
    const archivedWithTime = Object.entries(subItems)
      .filter(([id, items]) => !activeIds.has(id) && sumSubItemMinutes(items) > 0)
      .map(([id]) => getCategory(id))
    return [...activeCategories, ...archivedWithTime]
  }, [activeCategories, subItems, getCategory])

  const activeTimerTargets = useMemo(
    () => sessions.flatMap((timer) => getSessionTargets(timer)),
    [sessions],
  )
  const primaryTimer = sessions[0] ?? null

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

      const existingTimer = sessions.find((timer) => (
        getSessionTargets(timer).some((target) => (
          target.category === cat && target.taskName.trim() === name
        ))
      ))
      if (existingTimer) {
        openModal()
        return
      }

      const ok = start(name, cat, {
        date: selectedDate,
        mode: 'stopwatch',
        completionKind: cat === 'reading' ? 'reading' : undefined,
      })
      if (!ok) {
        pushNotice({ message: '计时未开始，可能已达到 8 个计时器上限', type: 'error' })
        return
      }
      pushNotice({ message: `已开始「${name}」独立计时`, type: 'success' })
    },
    [sessions, start, openModal, pushNotice, selectedDate],
  )

  /** 无需填写小类，直接按大类开始正计时 */
  const handleCategoryTimer = useCallback(
    (cat: Category) => {
      const label = getCategory(cat).label

      if (cat === 'reading') {
        navigate('/reading')
        pushNotice({ message: '请先选择或填写书名，再开始阅读计时', type: 'success' })
        return
      }

      const existingTimer = sessions.find((timer) => (
        getSessionTargets(timer).some((target) => (
          target.category === cat && target.taskName.trim() === label
        ))
      ))
      if (existingTimer) {
        openModal()
        return
      }

      const ok = start(label, cat, { date: selectedDate, mode: 'stopwatch' })
      if (!ok) {
        pushNotice({ message: '计时未开始，可能已达到 8 个计时器上限', type: 'error' })
        return
      }
      pushNotice({ message: `已开始「${label}」独立计时`, type: 'success' })
    },
    [getCategory, navigate, sessions, start, openModal, pushNotice, selectedDate],
  )

  const focusManualEntry = useCallback(() => {
    const section = document.getElementById('manual-entry')
    section?.scrollIntoView({ block: 'start' })
    window.requestAnimationFrame(() => {
      section?.querySelector<HTMLElement>('button, input')?.focus({ preventScroll: true })
    })
  }, [])

  const markSaved = useCallback(() => {
    setSaveStatus('saved')
  }, [])

  // 输入变更后自动保存（防抖）
  useEffect(() => {
    const timer = setTimeout(() => {
      const existing = getRecordByDate(selectedDate)
      const preservedReadingLogs = existing?.readingLogs ?? []
      const pending = buildRecordFromForm(selectedDate, subItems, preservedReadingLogs)

      if (!pending) {
        if (existing) {
          deleteRecord(selectedDate)
          markSaved()
        } else {
          setSaveStatus('idle')
        }
        return
      }

      if (existing && isSameFormAsRecord(selectedDate, subItems, preservedReadingLogs, existing)) {
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
      <PageCard className="p-2.5 sm:p-3">
        <div className="flex items-center gap-2.5">
          <DatePicker value={selectedDate} onChange={setSelectedDate} max={today()} />
          <SaveStatusBadge status={saveStatus} />
        </div>
      </PageCard>

      <section className="depot-cloth stitched-panel overflow-hidden rounded-[14px] p-4 sm:p-5" aria-labelledby="today-total-title">
        <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(12.5rem,auto)_minmax(0,1fr)] sm:items-end sm:gap-5">
          <div className="min-w-0 overflow-hidden border-b border-chrome-yellow/35 pb-3 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-5">
            <p id="today-total-title" className="depot-display text-sm font-extrabold tracking-[0.08em] text-chrome-yellow/85">
              {selectedDate === today() ? '今日已记录' : formatDisplayDate(selectedDate)}
            </p>
            <p className="depot-display mt-1 max-w-full whitespace-nowrap text-[2.25rem] font-extrabold leading-none tracking-[-0.02em] text-chrome-yellow sm:text-[2.65rem]">
              {formatSummaryTotal(total)}
            </p>
          </div>
          <div className="min-w-0 max-w-full overflow-x-auto overscroll-x-contain pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="各任务大类时长">
            <div
              className="grid w-full items-stretch"
              style={{
                gridTemplateColumns: `repeat(${Math.max(summaryCategories.length, 1)}, minmax(3.25rem, 1fr))`,
                minWidth: `${Math.max(summaryCategories.length, 1) * 3.25}rem`,
              }}
            >
              {summaryCategories.map((category) => {
                const minutes = sumSubItemMinutes(subItems[category.id])
                return (
                  <div
                    key={category.id}
                    className="min-w-0 border-l border-dashed border-chrome-yellow/30 px-1.5 first:border-l-0 first:pl-0"
                    aria-label={`${category.label} ${formatMinutes(minutes)}`}
                  >
                    <p className="truncate text-[11px] font-bold text-chrome-yellow/90 sm:text-xs">{category.label}</p>
                    <p className="depot-display mt-1 whitespace-nowrap text-base font-bold leading-none tabular-nums text-chrome-yellow/75">{formatCategoryDuration(minutes)}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="relative mt-4 grid grid-cols-2 gap-2 border-t border-chrome-yellow/35 pt-4">
          <button
            type="button"
            onClick={focusManualEntry}
            className="calico-surface stitched-light flex min-h-16 min-w-0 items-center justify-center gap-2 rounded-[12px] px-2 text-left text-sm font-extrabold text-terracotta active:bg-cream-dark"
          >
            <svg className="shrink-0" width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
            <span className="min-w-0 leading-tight">补记时间<span className="mt-1 block text-[11px] font-semibold text-stone-light">填写已有记录</span></span>
          </button>
          <button
            type="button"
            onClick={openModal}
            className="calico-surface stitched-light flex min-h-16 min-w-0 items-center justify-center gap-2 rounded-[12px] px-2 text-left text-sm font-extrabold text-terracotta active:bg-cream-dark"
          >
            <svg className="shrink-0" width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="9" /><path d="m10 8 6 4-6 4V8Z" /></svg>
            <span className="min-w-0 leading-tight">
              {sessions.length ? '管理计时器' : '开始计时'}
              <span className="mt-1 block text-[11px] font-semibold text-stone-light">
                {sessions.length ? `${sessions.length} 项分别控制` : '可连续添加任务'}
              </span>
            </span>
          </button>
          <span className="depot-eyelet absolute -bottom-1 -right-1 scale-75" aria-hidden />
        </div>
      </section>

      <section className="depot-cloth stitched-panel flex min-h-[5.5rem] items-center gap-3 overflow-hidden rounded-[14px] px-4 py-3" aria-label="当前计时">
        <div className="min-w-0 flex-1">
          <p className="depot-display text-xs font-extrabold tracking-[0.08em] text-chrome-yellow/80">
            {primaryTimer
              ? `${sessions.length} 个独立计时器 · ${sessions.filter((timer) => timer.status === 'running').length} 个运行中`
              : '当前没有计时'}
          </p>
          <p className="mt-1 truncate text-base font-bold text-chrome-yellow">
            {primaryTimer
              ? sessions.length === 1 ? primaryTimer.taskName : `${primaryTimer.taskName} 等 ${sessions.length} 项`
              : '选择任务开始'}
          </p>
        </div>
        <p className="stable-timer-slot depot-display shrink-0 text-right text-2xl font-extrabold tracking-[0.04em] text-chrome-yellow">
          {primaryTimer ? formatElapsed(getDisplayMs(primaryTimer, now)) : '00:00:00'}
        </p>
        <button
          type="button"
          onClick={openModal}
          aria-label={sessions.length ? '管理独立计时器' : '开始计时'}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] border border-chrome-yellow/65 text-chrome-yellow active:bg-chrome-yellow active:text-terracotta"
        >
          {sessions.length ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          ) : <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="m8 5 11 7-11 7V5Z" /></svg>}
        </button>
      </section>

      <div id="manual-entry" className="space-y-2.5 scroll-mt-24">
        <div className="flex items-center gap-2 px-1 pb-0.5 pt-1">
          <span className="depot-eyelet" aria-hidden />
          <h2 className="text-base font-extrabold text-terracotta">今日任务</h2>
          <p className="ml-auto text-xs font-medium text-stone-light">点计时直接开始 · 点卡片添加项目</p>
        </div>
        {activeCategories.map((definition) => (
          <CategoryInput
            key={definition.id}
            definition={definition}
            items={subItems[definition.id] ?? []}
            onChange={(items) => handleSubItemsChange(definition.id, items)}
            onQuickTimer={(item) => handleQuickTimer(definition.id, item)}
            onCategoryTimer={() => handleCategoryTimer(definition.id)}
            categoryTimerActive={
              activeTimerTargets.some((target) => (
                target.category === definition.id &&
                target.taskName.trim() === definition.label
              ))
            }
            activeTaskNames={activeTimerTargets
              .filter((target) => target.category === definition.id)
              .map((target) => target.taskName)}
          />
        ))}
      </div>
    </div>
  )
}
