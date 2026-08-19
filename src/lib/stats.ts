import dayjs from 'dayjs'
import type { Category, DailyRecord, TimeRange } from '../types'
import { CATEGORIES } from '../types'
import { subItemsFromRecord } from './categoryItems'
import {
  countCalendarDays,
  dateRange,
  DATE_FORMAT,
  isCheckInDay,
  resolveRangeBounds,
  today,
} from './dateUtils'

function earliestDate(records: DailyRecord[]): string | undefined {
  if (records.length === 0) return undefined
  return records.reduce((min, r) => (r.date < min ? r.date : min), records[0].date)
}

/** 单条记录各类合计分钟 */
export function getTotalMinutes(record: DailyRecord | Record<Category, number>): number {
  const minutes = 'minutes' in record ? record.minutes : record
  return CATEGORIES.reduce((sum, cat) => sum + (minutes[cat] ?? 0), 0)
}

/** 按时间范围筛选记录 */
export function filterByRange(records: DailyRecord[], range: TimeRange): DailyRecord[] {
  const { start, end } = resolveRangeBounds(range, earliestDate(records))
  return records.filter((r) => r.date >= start && r.date <= end)
}

/** 区间内总分钟数 */
export function getRangeTotalMinutes(records: DailyRecord[], range: TimeRange): number {
  return filterByRange(records, range).reduce((sum, r) => sum + getTotalMinutes(r), 0)
}

/**
 * 日均时长 = 区间总时长 / 区间日历天数
 * 使用日历天数而非仅有记录天数，空白天也计入分母
 */
export function getDailyAverage(records: DailyRecord[], range: TimeRange): number {
  const { start, end } = resolveRangeBounds(range, earliestDate(records))
  const days = countCalendarDays(start, end)
  if (days <= 0) return 0
  const total = getRangeTotalMinutes(records, range)
  return Math.round(total / days)
}

/** 当前连续打卡天数（从今天或 asOfDate 往前，任意类别 > 0 算打卡） */
export function calcStreak(records: DailyRecord[], asOfDate?: string): number {
  const endDate = asOfDate ?? today()
  const map = new Map(records.map((r) => [r.date, r]))
  let streak = 0
  let cur = dayjs(endDate)

  while (true) {
    const dateStr = cur.format(DATE_FORMAT)
    const record = map.get(dateStr)
    if (record && isCheckInDay(record.minutes)) {
      streak++
      cur = cur.subtract(1, 'day')
    } else {
      break
    }
  }
  return streak
}

/** 历史最长连续打卡 */
export function calcLongestStreak(records: DailyRecord[]): number {
  if (records.length === 0) return 0

  const checkInDates = records
    .filter((r) => isCheckInDay(r.minutes))
    .map((r) => r.date)
    .sort()

  if (checkInDates.length === 0) return 0

  let longest = 1
  let current = 1

  for (let i = 1; i < checkInDates.length; i++) {
    const prev = new Date(checkInDates[i - 1])
    const cur = new Date(checkInDates[i])
    const diffDays = (cur.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
    if (diffDays === 1) {
      current++
      longest = Math.max(longest, current)
    } else {
      current = 1
    }
  }
  return longest
}

/** 区间内各类别合计 */
export function aggregateByCategory(
  records: DailyRecord[],
  range: TimeRange,
): Record<Category, number> {
  const filtered = filterByRange(records, range)
  const result = {
    study: 0,
    meditation: 0,
    exercise: 0,
    reading: 0,
    gaming: 0,
  } as Record<Category, number>
  for (const r of filtered) {
    for (const cat of CATEGORIES) {
      result[cat] += r.minutes[cat]
    }
  }
  return result
}

/** 构建图表序列数据 */
export interface ChartSeriesData {
  dates: string[]
  series: Record<Category, number[]>
}

export function buildChartSeries(records: DailyRecord[], range: TimeRange): ChartSeriesData {
  const { start, end } = resolveRangeBounds(range, earliestDate(records))
  const dates = dateRange(start, end)
  const map = new Map(records.map((r) => [r.date, r]))

  const series = {} as Record<Category, number[]>
  for (const cat of CATEGORIES) {
    series[cat] = dates.map((d) => map.get(d)?.minutes[cat] ?? 0)
  }
  return { dates, series }
}

/** 热力图数据：[date, totalMinutes][] */
export function buildHeatmapData(records: DailyRecord[]): [string, number][] {
  return records.map((r) => [r.date, getTotalMinutes(r)] as [string, number])
}

export interface SubItemAggregate {
  name: string
  minutes: number
}

/** 区间内按大类汇总各小类总时长 */
export function aggregateSubItemsByCategory(
  records: DailyRecord[],
  range: TimeRange,
): Record<Category, SubItemAggregate[]> {
  const filtered = filterByRange(records, range)
  const maps = Object.fromEntries(
    CATEGORIES.map((cat) => [cat, new Map<string, number>()]),
  ) as Record<Category, Map<string, number>>

  for (const record of filtered) {
    const subItems = subItemsFromRecord(record)
    for (const cat of CATEGORIES) {
      for (const item of subItems[cat] ?? []) {
        if (item.minutes <= 0) continue
        const name = item.name.trim() || '未命名'
        const bucket = maps[cat]
        bucket.set(name, (bucket.get(name) ?? 0) + item.minutes)
      }
    }
  }

  const result = {} as Record<Category, SubItemAggregate[]>
  for (const cat of CATEGORIES) {
    result[cat] = Array.from(maps[cat].entries())
      .map(([name, minutes]) => ({ name, minutes }))
      .sort((a, b) => b.minutes - a.minutes)
  }
  return result
}
