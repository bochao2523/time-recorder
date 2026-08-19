import type { Category, CategorySubItem, CategorySubItems, DailyRecord, ImportMode } from '../types'
import { CATEGORIES, createEmptyMinutes } from '../types'
import { minutesFromSubItems, subItemsFromRecord } from './categoryItems'

const STORAGE_KEY = 'time-tracker:records'

/** 预留：未来可切换为云端 StorageAdapter */
export interface StorageAdapter {
  loadRecords(): DailyRecord[]
  saveRecords(records: DailyRecord[]): void
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function validateSubItem(raw: unknown): raw is CategorySubItem {
  if (!raw || typeof raw !== 'object') return false
  const item = raw as Record<string, unknown>
  return (
    typeof item.name === 'string' &&
    typeof item.minutes === 'number' &&
    item.minutes >= 0 &&
    Number.isInteger(item.minutes)
  )
}

function validateSubItems(raw: unknown): raw is CategorySubItems {
  if (!raw || typeof raw !== 'object' || raw === null) return false
  const obj = raw as Record<string, unknown>
  for (const key of Object.keys(obj)) {
    if (!CATEGORIES.includes(key as Category)) return false
    const items = obj[key]
    if (!Array.isArray(items)) return false
    if (!items.every(validateSubItem)) return false
  }
  return true
}

/** 校验单条记录格式 */
export function validateRecord(raw: unknown): raw is DailyRecord {
  if (!raw || typeof raw !== 'object') return false
  const r = raw as Record<string, unknown>
  if (typeof r.date !== 'string' || !DATE_RE.test(r.date)) return false
  if (!r.minutes || typeof r.minutes !== 'object') return false
  const minutes = r.minutes as Record<string, unknown>
  // 允许缺省新分类（如旧数据无 gaming），由 normalizeRecord 补 0
  for (const cat of CATEGORIES) {
    const v = minutes[cat]
    if (v === undefined) continue
    if (typeof v !== 'number' || v < 0 || !Number.isInteger(v)) return false
  }
  if (r.note !== undefined && typeof r.note !== 'string') return false
  if (r.subItems !== undefined && !validateSubItems(r.subItems)) return false
  if (r.categoryNotes !== undefined) {
    if (typeof r.categoryNotes !== 'object' || r.categoryNotes === null) return false
    const notes = r.categoryNotes as Record<string, unknown>
    for (const key of Object.keys(notes)) {
      if (!CATEGORIES.includes(key as Category)) return false
      if (typeof notes[key] !== 'string') return false
    }
  }
  return true
}

function normalizeSubItems(raw?: CategorySubItems): CategorySubItems | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const result: CategorySubItems = {}
  for (const cat of CATEGORIES) {
    const items = raw[cat]
    if (!items?.length) continue
    const cleaned = items
      .map((item) => ({
        name: item.name.trim(),
        minutes: item.minutes,
      }))
      // 有名称时保留 0 分钟，避免改时间时整行被清掉
      .filter((item) => item.minutes > 0 || item.name.length > 0)
    if (cleaned.length > 0) {
      result[cat] = cleaned
    }
  }
  return Object.keys(result).length > 0 ? result : undefined
}

/** 规范化记录（补齐缺失字段） */
export function normalizeRecord(raw: DailyRecord): DailyRecord {
  const subItems = normalizeSubItems(subItemsFromRecord(raw))
  const minutes = subItems ? minutesFromSubItems(subItems) : createEmptyMinutes()
  for (const cat of CATEGORIES) {
    if (!subItems?.[cat]?.length) {
      minutes[cat] = raw.minutes[cat] ?? 0
    }
  }
  return {
    date: raw.date,
    minutes,
    subItems,
  }
}

/** 从 localStorage 读取全部记录 */
export function loadRecords(): DailyRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(validateRecord).map(normalizeRecord)
  } catch {
    return []
  }
}

/** 写入 localStorage */
export function saveRecords(records: DailyRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

/** 按 date 覆盖或追加 */
export function upsertRecord(records: DailyRecord[], record: DailyRecord): DailyRecord[] {
  const normalized = normalizeRecord(record)
  const idx = records.findIndex((r) => r.date === normalized.date)
  if (idx >= 0) {
    const next = [...records]
    next[idx] = normalized
    return next
  }
  return [...records, normalized].sort((a, b) => a.date.localeCompare(b.date))
}

/** 删除指定日期记录 */
export function deleteRecord(records: DailyRecord[], date: string): DailyRecord[] {
  return records.filter((r) => r.date !== date)
}

/** 按日期查找 */
export function getRecordByDate(records: DailyRecord[], date: string): DailyRecord | undefined {
  return records.find((r) => r.date === date)
}

/** 解析导入 JSON 字符串 */
export function parseImportJson(json: string): DailyRecord[] {
  const parsed: unknown = JSON.parse(json)
  let arr: unknown[]
  if (Array.isArray(parsed)) {
    arr = parsed
  } else if (
    parsed &&
    typeof parsed === 'object' &&
    'records' in parsed &&
    Array.isArray((parsed as { records: unknown }).records)
  ) {
    arr = (parsed as { records: unknown[] }).records
  } else {
    throw new Error('这个文件不是有效的备份')
  }
  const valid = arr.filter(validateRecord).map(normalizeRecord)
  if (valid.length === 0) throw new Error('备份中没有可导入的记录')
  return valid
}

/** 合并或替换导入数据 */
export function importRecords(
  existing: DailyRecord[],
  imported: DailyRecord[],
  mode: ImportMode,
): DailyRecord[] {
  if (mode === 'replace') {
    return imported.sort((a, b) => a.date.localeCompare(b.date))
  }
  const map = new Map<string, DailyRecord>()
  for (const r of existing) map.set(r.date, r)
  for (const r of imported) map.set(r.date, r)
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
}

/** 触发 JSON 文件下载 */
export function downloadRecords(records: DailyRecord[]): void {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    records,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  a.href = url
  a.download = `time-tracker-backup-${dateStr}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/** 类别标签映射（供 storage 层外使用） */
export type { Category }
