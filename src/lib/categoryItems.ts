import {
  CATEGORIES,
  createEmptyMinutes,
  type Category,
  type CategorySubItem,
  type CategorySubItems,
  type DailyRecord,
} from '../types'

export function sumSubItemMinutes(items: CategorySubItem[] | undefined): number {
  if (!items?.length) return 0
  return items.reduce((sum, item) => sum + (item.minutes > 0 ? item.minutes : 0), 0)
}

export function minutesFromSubItems(subItems: CategorySubItems): Record<Category, number> {
  const minutes = createEmptyMinutes()
  for (const cat of CATEGORIES) {
    minutes[cat] = sumSubItemMinutes(subItems[cat])
  }
  return minutes
}

/** 从记录中提取各类别小类（兼容旧版仅有 minutes / categoryNotes 的数据） */
export function subItemsFromRecord(record: DailyRecord): CategorySubItems {
  const result: CategorySubItems = {}

  for (const cat of CATEGORIES) {
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

  for (const cat of CATEGORIES) {
    const items = raw[cat]
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
): DailyRecord | null {
  const normalizedSubItems = normalizeSubItemsForSave(subItems)
  if (!normalizedSubItems) return null

  return {
    date,
    minutes: minutesFromSubItems(normalizedSubItems),
    subItems: normalizedSubItems,
  }
}

/** 比较表单状态与已存记录是否一致 */
export function isSameFormAsRecord(
  date: string,
  subItems: CategorySubItems,
  existing: DailyRecord,
): boolean {
  const pending = buildRecordFromForm(date, subItems)
  const snapshot = buildRecordFromForm(existing.date, subItemsFromRecord(existing))
  if (!pending && !snapshot) return true
  if (!pending || !snapshot) return false
  return (
    JSON.stringify(pending.minutes) === JSON.stringify(snapshot.minutes) &&
    JSON.stringify(pending.subItems) === JSON.stringify(snapshot.subItems)
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

  return buildRecordFromForm(date, { ...subItems, [category]: items })
}
