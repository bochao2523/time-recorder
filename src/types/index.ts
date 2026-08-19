export const CATEGORIES = ['study', 'meditation', 'exercise', 'reading', 'gaming'] as const
export type Category = (typeof CATEGORIES)[number]

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

export interface DailyRecord {
  /** YYYY-MM-DD，每天唯一一条 */
  date: string
  minutes: Record<Category, number>
  /** 各大类下的小类及时长明细 */
  subItems?: CategorySubItems
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
export function createEmptyMinutes(): Record<Category, number> {
  return {
    study: 0,
    meditation: 0,
    exercise: 0,
    reading: 0,
    gaming: 0,
  }
}
