import dayjs from 'dayjs'
import type { DailyRecord } from '../types'
import { countReadingPages } from './readingLogs'
import { DATE_FORMAT, today } from './dateUtils'

export interface ReadingSessionData {
  id: string
  bookTitle: string
  date: string
  startPage: number | null
  endPage: number | null
  pages: number
  minutes: number
  completedAt: string | null
}

export interface ReadingTrendDay {
  date: string
  pages: number
  minutes: number
}

export interface ReadingBookInsights {
  title: string
  sessions: ReadingSessionData[]
  totalMinutes: number
  totalPagesRead: number
  currentPage: number
  readingDays: number
  firstDate: string | null
  lastDate: string | null
  averageDailyMinutes: number
  averageDailyPages: number
  secondsPerPage: number | null
  progressPercent: number | null
  remainingPages: number | null
  estimatedDays: number | null
  estimatedMinutes: number | null
  hourlyMinutes: number[]
  peakHour: number | null
  trend: ReadingTrendDay[]
  longestStreak: number
}

export function collectReadingSessions(records: readonly DailyRecord[]): ReadingSessionData[] {
  return records
    .flatMap((record) => (record.readingLogs ?? []).map((entry) => ({
      id: entry.id,
      bookTitle: entry.bookTitle.trim(),
      date: record.date,
      startPage: entry.startPage,
      endPage: entry.endPage,
      pages: countReadingPages(entry),
      minutes: entry.minutes ?? 0,
      completedAt: entry.completedAt?.trim() || null,
    })))
    .filter((session) => session.bookTitle.length > 0)
    .sort((a, b) => (
      (b.completedAt ?? `${b.date}T00:00:00`).localeCompare(a.completedAt ?? `${a.date}T00:00:00`)
    ))
}

export function recentReadingBooks(sessions: readonly ReadingSessionData[], limit = 5): string[] {
  const result: string[] = []
  const seen = new Set<string>()
  for (const session of sessions) {
    const key = session.bookTitle.toLocaleLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(session.bookTitle)
    if (result.length >= limit) break
  }
  return result
}

function longestDateStreak(dates: readonly string[]): number {
  const unique = Array.from(new Set(dates)).sort()
  let longest = 0
  let current = 0
  let previous: dayjs.Dayjs | null = null
  for (const date of unique) {
    const value = dayjs(date)
    current = previous && value.diff(previous, 'day') === 1 ? current + 1 : 1
    longest = Math.max(longest, current)
    previous = value
  }
  return longest
}

export function buildReadingBookInsights(
  allSessions: readonly ReadingSessionData[],
  title: string,
  totalPages?: number,
  endDate = today(),
): ReadingBookInsights {
  const key = title.trim().toLocaleLowerCase()
  const sessions = allSessions.filter((session) => session.bookTitle.toLocaleLowerCase() === key)
  const totalMinutes = sessions.reduce((sum, session) => sum + session.minutes, 0)
  const totalPagesRead = sessions.reduce((sum, session) => sum + session.pages, 0)
  const currentPage = sessions.reduce((maximum, session) => Math.max(maximum, session.endPage ?? 0), 0)
  const activeDates = sessions
    .filter((session) => session.minutes > 0 || session.pages > 0)
    .map((session) => session.date)
  const readingDays = new Set(activeDates).size
  const firstDate = activeDates.length ? [...activeDates].sort()[0] : null
  const lastDate = activeDates.length ? [...activeDates].sort().at(-1) ?? null : null
  const averageDailyMinutes = readingDays ? totalMinutes / readingDays : 0
  const averageDailyPages = readingDays ? totalPagesRead / readingDays : 0
  const secondsPerPage = totalPagesRead > 0 && totalMinutes > 0
    ? (totalMinutes * 60) / totalPagesRead
    : null
  const normalizedTotalPages = totalPages && totalPages > 0 ? totalPages : undefined
  const progressPercent = normalizedTotalPages
    ? Math.min(100, (currentPage / normalizedTotalPages) * 100)
    : null
  const remainingPages = normalizedTotalPages ? Math.max(0, normalizedTotalPages - currentPage) : null
  const estimatedDays = remainingPages != null && remainingPages > 0 && averageDailyPages > 0
    ? Math.ceil(remainingPages / averageDailyPages)
    : remainingPages === 0 && normalizedTotalPages ? 0 : null
  const estimatedMinutes = remainingPages != null && secondsPerPage != null
    ? Math.round((remainingPages * secondsPerPage) / 60)
    : null

  const hourlyMinutes = Array.from({ length: 24 }, () => 0)
  for (const session of sessions) {
    if (!session.completedAt || session.minutes <= 0) continue
    const completed = dayjs(session.completedAt)
    if (!completed.isValid()) continue
    for (let minute = 0; minute < session.minutes; minute += 1) {
      const hour = completed.subtract(minute, 'minute').hour()
      hourlyMinutes[hour] += 1
    }
  }
  const hourlyMaximum = Math.max(...hourlyMinutes)
  const peakHour = hourlyMaximum > 0 ? hourlyMinutes.indexOf(hourlyMaximum) : null

  const trendStart = dayjs(endDate).subtract(13, 'day')
  const trend = Array.from({ length: 14 }, (_, index) => {
    const date = trendStart.add(index, 'day').format(DATE_FORMAT)
    const matching = sessions.filter((session) => session.date === date)
    return {
      date,
      pages: matching.reduce((sum, session) => sum + session.pages, 0),
      minutes: matching.reduce((sum, session) => sum + session.minutes, 0),
    }
  })

  return {
    title: title.trim(),
    sessions,
    totalMinutes,
    totalPagesRead,
    currentPage,
    readingDays,
    firstDate,
    lastDate,
    averageDailyMinutes,
    averageDailyPages,
    secondsPerPage,
    progressPercent,
    remainingPages,
    estimatedDays,
    estimatedMinutes,
    hourlyMinutes,
    peakHour,
    trend,
    longestStreak: longestDateStreak(activeDates),
  }
}

export function formatReadingSeconds(seconds: number | null): string {
  if (seconds == null || !Number.isFinite(seconds)) return '—'
  if (seconds < 60) return `${Math.round(seconds)} 秒`
  const minutes = Math.floor(seconds / 60)
  const remainder = Math.round(seconds % 60)
  return remainder ? `${minutes} 分 ${remainder} 秒` : `${minutes} 分钟`
}
