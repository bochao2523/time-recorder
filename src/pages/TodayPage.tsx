import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageCard } from '../components/layout/Layout'
import { DatePicker } from '../components/common/DatePicker'
import { CategoryInput } from '../components/common/CategoryInput'
import { useRecords } from '../context/RecordsContext'
import { useTimer } from '../context/TimerContext'
import {
  CATEGORIES,
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

const AUTO_SAVE_DELAY_MS = 600
const SAVED_HINT_DURATION_MS = 3000

type SaveStatus = 'idle' | 'pending' | 'saved'

function SaveStatusBadge({ status }: { status: SaveStatus }) {
  if (status === 'saved') {
    return (
      <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-sage/10 px-3 py-1.5 text-xs font-semibold text-sage">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <polyline points="20 6 9 17 4 12" />
        </svg>
        保存好啦
      </div>
    )
  }

  if (status === 'pending') {
    return (
      <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-cream-dark px-3 py-1.5 text-sm text-stone-light">
        <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-stone-light/30 border-t-stone-light" />
        保存中…
      </div>
    )
  }

  return null
}

export function TodayPage() {
  const [searchParams] = useSearchParams()
  const { records, getRecordByDate, upsertRecord, deleteRecord } = useRecords()
  const { session, start, openModal, pushNotice } = useTimer()

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
    <div className="space-y-3">
      <PageCard className="bg-white/90">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            <DatePicker value={selectedDate} onChange={setSelectedDate} max={today()} />
            {selectedDate !== today() && (
              <p className="mt-2 text-sm text-stone-light">
                正在编辑 {formatDisplayDate(selectedDate)}
              </p>
            )}
          </div>
          {saveStatus !== 'idle' && <div className="flex items-center justify-end sm:pb-1"><SaveStatusBadge status={saveStatus} /></div>}
        </div>
      </PageCard>

      <div className="relative overflow-hidden rounded-2xl bg-terracotta px-4 py-3.5 text-white shadow-[0_10px_30px_rgba(223,104,75,0.22)]">
        <div className="absolute -right-5 -top-9 h-24 w-24 rounded-full bg-white/10" />
        <div className="absolute -bottom-8 right-12 h-16 w-16 rounded-full bg-white/5" />
        <div className="relative flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-white/80">
              {total > 0 ? '今天已经积累 ✨' : '从一个小任务开始吧'}
            </p>
            <p className="mt-0.5 text-2xl font-bold tracking-tight">{formatMinutes(total)}</p>
          </div>
          <button
            type="button"
            onClick={openModal}
            className="mb-0.5 flex min-h-10 items-center gap-1.5 rounded-full bg-white px-3.5 text-xs font-bold text-terracotta shadow-sm active:scale-[0.97]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 1.5M9 2h6" /></svg>
            开始计时
          </button>
        </div>
      </div>

      <div className="space-y-2.5">
        {CATEGORIES.map((cat) => (
          <CategoryInput
            key={cat}
            category={cat}
            items={subItems[cat] ?? []}
            onChange={(items) => handleSubItemsChange(cat, items)}
            onQuickTimer={(item) => handleQuickTimer(cat, item)}
            activeTaskName={
              session?.category === cat ? session.taskName : null
            }
          />
        ))}
      </div>
    </div>
  )
}
