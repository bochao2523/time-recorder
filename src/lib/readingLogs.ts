import type { ReadingLogEntry } from '../types'

function normalizePage(value: number | null): number | null {
  return Number.isInteger(value) && value != null && value >= 1 ? value : null
}

/** 保存前清理空记录，并保证页码为正整数。 */
export function normalizeReadingLogs(
  entries: readonly ReadingLogEntry[] | undefined,
): ReadingLogEntry[] | undefined {
  if (!entries?.length) return undefined

  const cleaned = entries
    .map((entry) => ({
      id: entry.id.trim(),
      bookTitle: entry.bookTitle.trim(),
      startPage: normalizePage(entry.startPage),
      endPage: normalizePage(entry.endPage),
    }))
    .filter((entry) => (
      entry.id.length > 0 &&
      (entry.bookTitle.length > 0 || entry.startPage != null || entry.endPage != null)
    ))

  return cleaned.length > 0 ? cleaned : undefined
}

/** 首尾页都计入；页码不完整或倒序时返回 0。 */
export function countReadingPages(entry: ReadingLogEntry): number {
  if (entry.startPage == null || entry.endPage == null) return 0
  if (entry.endPage < entry.startPage) return 0
  return entry.endPage - entry.startPage + 1
}

export function totalReadingPages(entries: readonly ReadingLogEntry[]): number {
  return entries.reduce((total, entry) => total + countReadingPages(entry), 0)
}
