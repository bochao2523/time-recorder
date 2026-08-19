import dayjs from 'dayjs'
import type { TimeRange } from '../types'

export const DATE_FORMAT = 'YYYY-MM-DD'

/** 今天日期字符串 */
export function today(): string {
  return dayjs().format(DATE_FORMAT)
}

/** 格式化日期为 YYYY-MM-DD */
export function formatDate(date: dayjs.Dayjs | string | Date): string {
  return dayjs(date).format(DATE_FORMAT)
}

/** 格式化显示：M月D日 周X */
export function formatDisplayDate(dateStr: string): string {
  const d = dayjs(dateStr)
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  return `${d.format('M月D日')} 周${weekdays[d.day()]}`
}

/** 短格式：MM/DD */
export function formatShortDate(dateStr: string): string {
  return dayjs(dateStr).format('MM/DD')
}

/** 根据 TimeRange 计算起止日期（含边界） */
export function resolveRangeBounds(
  range: TimeRange,
  earliestRecord?: string,
): { start: string; end: string } {
  const end = range.end ?? today()

  if (range.preset === 'today') {
    return { start: end, end }
  }
  if (range.preset === '7d') {
    return { start: dayjs(end).subtract(6, 'day').format(DATE_FORMAT), end }
  }
  if (range.preset === '30d') {
    return { start: dayjs(end).subtract(29, 'day').format(DATE_FORMAT), end }
  }
  if (range.preset === 'all') {
    return {
      start: earliestRecord ?? dayjs(end).subtract(365, 'day').format(DATE_FORMAT),
      end,
    }
  }
  // custom
  return {
    start: range.start ?? dayjs(end).subtract(29, 'day').format(DATE_FORMAT),
    end,
  }
}

/** 区间内日历天数（含起止） */
export function countCalendarDays(start: string, end: string): number {
  return dayjs(end).diff(dayjs(start), 'day') + 1
}

/** 分钟数转为「X小时Y分」 */
export function formatMinutes(total: number): string {
  if (total <= 0) return '0 分钟'
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m} 分钟`
  if (m === 0) return `${h} 小时`
  return `${h} 小时 ${m} 分`
}

/** 生成日期序列（含起止） */
export function dateRange(start: string, end: string): string[] {
  const dates: string[] = []
  let cur = dayjs(start)
  const endD = dayjs(end)
  while (cur.isBefore(endD) || cur.isSame(endD, 'day')) {
    dates.push(cur.format(DATE_FORMAT))
    cur = cur.add(1, 'day')
  }
  return dates
}

/** 判断记录日是否有效打卡（任意类别 > 0） */
export function isCheckInDay(minutes: Record<string, number>): boolean {
  return Object.values(minutes).some((m) => m > 0)
}
