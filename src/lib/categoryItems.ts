import {
  CATEGORIES,
  type Category,
  type CategorySubItem,
  type CategorySubItems,
  type DailyRecord,
  type ReadingLogEntry,
} from '../types'
import type { TimerTarget } from './timerStorage'
import { normalizeReadingLogs } from './readingLogs'

export function sumSubItemMinutes(items: CategorySubItem[] | undefined): number {
  if (!items?.length) return 0
  return items.reduce((sum, item) => sum + (item.minutes > 0 ? item.minutes : 0), 0)
}

export function minutesFromSubItems(subItems: CategorySubItems): Record<Category, number> {
  const minutes: Record<Category, number> = {}
  for (const [cat, items] of Object.entries(subItems)) {
    minutes[cat] = sumSubItemMinutes(items)
  }
  return minutes
}

/** 从记录中提取各类别小类（兼容旧版仅有 minutes / categoryNotes 的数据） */
export function subItemsFromRecord(record: DailyRecord): CategorySubItems {
  const result: CategorySubItems = {}

  const categories = new Set([
    ...CATEGORIES,
    ...Object.keys(record.minutes ?? {}),
    ...Object.keys(record.subItems ?? {}),
    ...Object.keys(record.categoryNotes ?? {}),
  ])

  for (const cat of categories) {
    const existing = record.subItems?.[cat]
    if (existing?.length) {
      result[cat] = existing.map((item) => ({ ...item }))
      continue
    }

    const mins = record.minutes[cat] ?? 0
    const note = record.categoryNotes?.[cat]?.trim()
    if (mins > 0 || note) {
      result[cat] = [{ name: note ?? '', minutes: mins }]
    }
  }

  return result
}

export function createEmptySubItems(): CategorySubItems {
  return {}
}

/** 保存前清理：去掉完全空行；有名称时即使分钟为 0 也保留，方便改时间 */
export function normalizeSubItemsForSave(raw: CategorySubItems): CategorySubItems | undefined {
  const result: CategorySubItems = {}

  for (const [cat, items] of Object.entries(raw)) {
    if (!items?.length) continue

    const cleaned = items
      .map((item) => ({
        name: item.name.trim(),
        minutes: item.minutes,
      }))
      .filter((item) => item.minutes > 0 || item.name.length > 0)

    if (cleaned.length > 0) {
      result[cat] = cleaned
    }
  }

  return Object.keys(result).length > 0 ? result : undefined
}

/** 从表单状态构建待保存记录；无有效内容时返回 null */
export function buildRecordFromForm(
  date: string,
  subItems: CategorySubItems,
  readingLogs: readonly ReadingLogEntry[] = [],
): DailyRecord | null {
  const normalizedSubItems = normalizeSubItemsForSave(subItems)
  const normalizedReadingLogs = normalizeReadingLogs(readingLogs)
  if (!normalizedSubItems && !normalizedReadingLogs) return null

  return {
    date,
    minutes: normalizedSubItems ? minutesFromSubItems(normalizedSubItems) : {},
    subItems: normalizedSubItems,
    readingLogs: normalizedReadingLogs,
  }
}

/** 比较表单状态与已存记录是否一致 */
export function isSameFormAsRecord(
  date: string,
  subItems: CategorySubItems,
  readingLogs: readonly ReadingLogEntry[],
  existing: DailyRecord,
): boolean {
  const pending = buildRecordFromForm(date, subItems, readingLogs)
  const snapshot = buildRecordFromForm(
    existing.date,
    subItemsFromRecord(existing),
    existing.readingLogs,
  )
  if (!pending && !snapshot) return true
  if (!pending || !snapshot) return false
  return (
    JSON.stringify(pending.minutes) === JSON.stringify(snapshot.minutes) &&
    JSON.stringify(pending.subItems) === JSON.stringify(snapshot.subItems) &&
    JSON.stringify(pending.readingLogs) === JSON.stringify(snapshot.readingLogs)
  )
}

export function formatCategoryCell(record: DailyRecord, category: Category): string {
  const items = record.subItems?.[category]
  if (items?.length) {
    return items
      .filter((item) => item.minutes > 0)
      .map((item) => (item.name ? `${item.name} ${item.minutes}` : `${item.minutes}`))
      .join('、')
  }
  const mins = record.minutes[category]
  return mins > 0 ? String(mins) : '—'
}

/** 将计时分钟累加到指定分类的同名小类；无同名则新建一行 */
export function appendTaskMinutesToRecord(
  existing: DailyRecord | undefined,
  date: string,
  category: Category,
  taskName: string,
  minutes: number,
): DailyRecord | null {
  if (minutes <= 0) return null

  const name = taskName.trim()
  const subItems = existing ? subItemsFromRecord(existing) : createEmptySubItems()
  const items = [...(subItems[category] ?? [])]
  const idx = items.findIndex((item) => item.name.trim() === name)

  if (idx >= 0) {
    items[idx] = { ...items[idx], minutes: items[idx].minutes + minutes }
  } else {
    items.push({ name, minutes })
  }

  return buildRecordFromForm(
    date,
    { ...subItems, [category]: items },
    existing?.readingLogs,
  )
}

/** 同一次计时的每个任务都获得完整时长，因此总时长会按任务数累加。 */
export function appendTimerTargetsToRecord(
  existing: DailyRecord | undefined,
  date: string,
  targets: readonly TimerTarget[],
  minutes: number,
): DailyRecord | null {
  if (minutes <= 0 || targets.length === 0) return null

  let next = existing
  for (const target of targets) {
    next = appendTaskMinutesToRecord(
      next,
      date,
      target.category,
      target.taskName,
      minutes,
    ) ?? next
  }
  return next ?? null
}

/** 阅读计时完成后，同时写入主页面阅读任务与逐次页码日志。 */
export function appendReadingSessionToRecord(
  existing: DailyRecord | undefined,
  date: string,
  entry: ReadingLogEntry,
): DailyRecord | null {
  const minutes = entry.minutes ?? 0
  const timed = minutes > 0
    ? appendTaskMinutesToRecord(existing, date, 'reading', entry.bookTitle, minutes)
    : existing ?? { date, minutes: {} }
  if (!timed) return null

  return {
    ...timed,
    readingLogs: normalizeReadingLogs([
      ...(existing?.readingLogs ?? []),
      entry,
    ]),
  }
}
