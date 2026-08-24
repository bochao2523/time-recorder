export type Category = string

export interface CategoryDefinition {
  id: Category
  label: string
  color: string
  active: boolean
  builtin?: boolean
}

export const DEFAULT_CATEGORY_DEFINITIONS: readonly CategoryDefinition[] = [
  { id: 'study', label: '学习', color: '#00533F', active: true, builtin: true },
  { id: 'meditation', label: '冥想', color: '#A93C63', active: true, builtin: true },
  { id: 'exercise', label: '运动', color: '#965F00', active: true, builtin: true },
  { id: 'reading', label: '阅读', color: '#215DCA', active: true, builtin: true },
  { id: 'gaming', label: '游戏', color: '#A4470C', active: true, builtin: true },
]

/** 旧版默认大类；保留用于读取没有自定义配置的历史数据。 */
export const CATEGORIES: readonly Category[] = DEFAULT_CATEGORY_DEFINITIONS.map((category) => category.id)

export const CATEGORY_LABELS: Record<Category, string> = {
  study: '学习',
  meditation: '冥想',
  exercise: '运动',
  reading: '阅读',
  gaming: '游戏',
}

export interface CategorySubItem {
  /** 小类名称，如「数学」「跑步」 */
  name: string
  minutes: number
}

export type CategorySubItems = Partial<Record<Category, CategorySubItem[]>>

export interface ReadingLogEntry {
  id: string
  /** 本次阅读的书名 */
  bookTitle: string
  /** 起始页；未填写时为 null */
  startPage: number | null
  /** 结束页；未填写时为 null */
  endPage: number | null
  /** 本次阅读计时产生的分钟数；不足 30 秒为 0，旧记录可能没有 */
  minutes?: number
  /** 本次阅读结束时间；ISO 字符串，旧记录可能没有 */
  completedAt?: string
}

/** 跨日期保存的书籍资料，用于阅读进度与完读预估。 */
export interface ReadingBookMeta {
  title: string
  totalPages: number
  updatedAt: string
}

export interface DailyRecord {
  /** YYYY-MM-DD，每天唯一一条 */
  date: string
  minutes: Record<Category, number>
  /** 各大类下的小类及时长明细 */
  subItems?: CategorySubItems
  /** 当天的书籍阅读页码记录 */
  readingLogs?: ReadingLogEntry[]
  /** @deprecated 旧版各类别备注，导入时会迁移到 subItems */
  categoryNotes?: Partial<Record<Category, string>>
  /** @deprecated 当天备注已移除，旧数据导入时忽略 */
  note?: string
}

export type TimeRangePreset = 'today' | '7d' | '30d' | 'all' | 'custom'

export interface TimeRange {
  preset: TimeRangePreset
  start?: string
  end?: string
}

export type ImportMode = 'merge' | 'replace'

/** 创建各类均为 0 的分钟对象 */
export function createEmptyMinutes(categories: readonly Category[] = CATEGORIES): Record<Category, number> {
  return Object.fromEntries(categories.map((category) => [category, 0]))
}
