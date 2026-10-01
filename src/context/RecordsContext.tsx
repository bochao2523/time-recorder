import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import dayjs from 'dayjs'
import type { DailyRecord, ImportMode, ReadingBookMeta } from '../types'
import { appendReadingLogToRecord, appendReadingSessionToRecord, removeReadingSessions, updateReadingSessionPages } from '../lib/categoryItems'
import { today } from '../lib/dateUtils'
import { createTimerId } from '../lib/timerStorage'
import { useCategories } from './useCategories'
import {
  deleteRecord as deleteRecordStorage,
  downloadRecords,
  getRecordByDate,
  importRecords as importRecordsStorage,
  loadRecords,
  loadReadingBooks,
  mergeReadingBooks,
  parseImportJson,
  saveRecords,
  saveReadingBooks,
  upsertReadingBook,
  upsertRecord as upsertRecordStorage,
} from '../lib/storage'

interface RecordsContextValue {
  records: DailyRecord[]
  readingBooks: ReadingBookMeta[]
  upsertRecord: (record: DailyRecord) => void
  deleteRecord: (date: string) => void
  getRecordByDate: (date: string) => DailyRecord | undefined
  refresh: () => void
  exportRecords: () => void
  importRecords: (json: string, mode: ImportMode) => void
  setReadingBookTotalPages: (title: string, totalPages: number) => void
  renameReadingBook: (oldTitle: string, newTitle: string) => boolean
  updateReadingLogPages: (date: string, sessionId: string, startPage: number, endPage: number) => boolean
  deleteReadingLog: (date: string, sessionId: string) => boolean
  deleteReadingBook: (title: string, deleteHistory: boolean) => void
  addManualReadingSession: (input: {
    bookTitle: string
    totalPages: number
    date: string
    minutes: number
    startPage: number
    endPage: number
  }) => { ok: boolean; message: string }
  linkRecordedReadingSession: (input: {
    id: string
    bookTitle: string
    totalPages: number
    date: string
    minutes: number
    startPage: number
    endPage: number
    completedAt?: string
  }) => { ok: boolean; message: string }
}

const RecordsContext = createContext<RecordsContextValue | null>(null)

export function RecordsProvider({ children }: { children: ReactNode }) {
  const { categories, importCategoryDefinitions } = useCategories()
  const [records, setRecords] = useState<DailyRecord[]>(() => loadRecords())
  const [readingBooks, setReadingBooks] = useState<ReadingBookMeta[]>(() => loadReadingBooks())

  const upsertRecord = useCallback((record: DailyRecord) => {
    setRecords((prev) => {
      const next = upsertRecordStorage(prev, record)
      saveRecords(next)
      return next
    })
  }, [])

  const deleteRecord = useCallback((date: string) => {
    setRecords((prev) => {
      const next = deleteRecordStorage(prev, date)
      saveRecords(next)
      return next
    })
  }, [])

  const getRecord = useCallback(
    (date: string) => getRecordByDate(records, date),
    [records],
  )

  const refresh = useCallback(() => {
    setRecords(loadRecords())
    setReadingBooks(loadReadingBooks())
  }, [])

  const setReadingBookTotalPages = useCallback((title: string, totalPages: number) => {
    if (!title.trim() || !Number.isInteger(totalPages) || totalPages < 1) return
    setReadingBooks((previous) => {
      const next = upsertReadingBook(previous, title, totalPages)
      saveReadingBooks(next)
      return next
    })
  }, [])

  const renameReadingBook = useCallback((oldTitle: string, newTitle: string) => {
    const oldKey = oldTitle.trim().toLocaleLowerCase()
    const normalizedTitle = newTitle.trim()
    const newKey = normalizedTitle.toLocaleLowerCase()
    if (!oldKey || !newKey) return false
    const source = readingBooks.find((book) => book.title.toLocaleLowerCase() === oldKey)
    const duplicate = readingBooks.some((book) => book.title.toLocaleLowerCase() === newKey && book.title.toLocaleLowerCase() !== oldKey)
    if (!source || duplicate) return false

    setReadingBooks((previous) => {
      const next = previous.map((book) => book.title.toLocaleLowerCase() === oldKey
        ? { ...book, title: normalizedTitle, updatedAt: new Date().toISOString() }
        : book)
      saveReadingBooks(next)
      return next
    })
    setRecords((previous) => {
      let changed = false
      const next = previous.map((record) => {
        if (!(record.readingLogs ?? []).some((entry) => entry.bookTitle.trim().toLocaleLowerCase() === oldKey)) return record
        changed = true
        return {
          ...record,
          readingLogs: record.readingLogs?.map((entry) => entry.bookTitle.trim().toLocaleLowerCase() === oldKey
            ? { ...entry, bookTitle: normalizedTitle }
            : entry),
        }
      })
      if (changed) saveRecords(next)
      return changed ? next : previous
    })
    return true
  }, [readingBooks])

  const updateReadingLogPages = useCallback((date: string, sessionId: string, startPage: number, endPage: number) => {
    let updated = false
    setRecords((previous) => {
      const next = previous.map((record) => {
        if (record.date !== date) return record
        const changed = updateReadingSessionPages(record, sessionId, startPage, endPage)
        if (!changed) return record
        updated = true
        return changed
      })
      if (updated) saveRecords(next)
      return updated ? next : previous
    })
    return updated
  }, [])

  const deleteReadingLog = useCallback((date: string, sessionId: string) => {
    let deleted = false
    setRecords((previous) => {
      const next = previous.flatMap((record) => {
        if (record.date !== date || !(record.readingLogs ?? []).some((entry) => entry.id === sessionId)) return [record]
        deleted = true
        const changed = removeReadingSessions(record, (entry) => entry.id === sessionId)
        return changed ? [changed] : []
      })
      if (deleted) saveRecords(next)
      return deleted ? next : previous
    })
    return deleted
  }, [])

  const deleteReadingBook = useCallback((title: string, deleteHistory: boolean) => {
    const key = title.trim().toLocaleLowerCase()
    setReadingBooks((previous) => {
      const next = previous.filter((book) => book.title.toLocaleLowerCase() !== key)
      saveReadingBooks(next)
      return next
    })
    if (!deleteHistory) return
    setRecords((previous) => {
      const next = previous.flatMap((record) => {
        const changed = removeReadingSessions(record, (entry) => entry.bookTitle.trim().toLocaleLowerCase() === key)
        return changed ? [changed] : []
      })
      saveRecords(next)
      return next
    })
  }, [])

  const addManualReadingSession = useCallback((input: {
    bookTitle: string
    totalPages: number
    date: string
    minutes: number
    startPage: number
    endPage: number
  }): { ok: boolean; message: string } => {
    const requestedTitle = input.bookTitle.trim()
    const existingBook = readingBooks.find((book) => (
      book.title.toLocaleLowerCase() === requestedTitle.toLocaleLowerCase()
    ))
    const bookTitle = existingBook?.title ?? requestedTitle
    const totalPages = existingBook?.totalPages ?? input.totalPages
    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(input.date) &&
      dayjs(input.date).format('YYYY-MM-DD') === input.date &&
      input.date <= today()

    if (!bookTitle) return { ok: false, message: '请填写书名' }
    if (!Number.isInteger(totalPages) || totalPages < 1 || totalPages > 99_999) {
      return { ok: false, message: '书籍总页数需在 1–99999 页之间' }
    }
    if (!validDate) return { ok: false, message: '请选择今天或更早的有效日期' }
    if (!Number.isInteger(input.minutes) || input.minutes < 1 || input.minutes > 1_440) {
      return { ok: false, message: '阅读时间需在 1 分钟至 24 小时之间' }
    }
    if (
      !Number.isInteger(input.startPage) || input.startPage < 1 ||
      !Number.isInteger(input.endPage) || input.endPage < input.startPage ||
      input.endPage > totalPages
    ) {
      return { ok: false, message: `页码需在 1–${totalPages} 之间，且结束页不能小于开始页` }
    }

    if (!existingBook) {
      setReadingBooks((previous) => {
        const next = upsertReadingBook(previous, bookTitle, totalPages)
        saveReadingBooks(next)
        return next
      })
    }

    setRecords((previous) => {
      const existing = getRecordByDate(previous, input.date)
      const record = appendReadingSessionToRecord(existing, input.date, {
        id: createTimerId(),
        bookTitle,
        startPage: input.startPage,
        endPage: input.endPage,
        minutes: input.minutes,
      })
      if (!record) return previous
      const next = upsertRecordStorage(previous, record)
      saveRecords(next)
      return next
    })

    return {
      ok: true,
      message: `已补记《${bookTitle}》${input.endPage - input.startPage + 1} 页 · ${input.minutes} 分钟`,
    }
  }, [readingBooks])

  const linkRecordedReadingSession = useCallback((input: {
    id: string
    bookTitle: string
    totalPages: number
    date: string
    minutes: number
    startPage: number
    endPage: number
    completedAt?: string
  }): { ok: boolean; message: string } => {
    const requestedTitle = input.bookTitle.trim()
    const existingBook = readingBooks.find((book) => (
      book.title.toLocaleLowerCase() === requestedTitle.toLocaleLowerCase()
    ))
    const bookTitle = existingBook?.title ?? requestedTitle
    const totalPages = existingBook?.totalPages ?? input.totalPages
    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(input.date) &&
      dayjs(input.date).format('YYYY-MM-DD') === input.date &&
      input.date <= today()

    if (!bookTitle) return { ok: false, message: '请填写书名' }
    if (!Number.isInteger(totalPages) || totalPages < 1 || totalPages > 99_999) {
      return { ok: false, message: '书籍总页数需在 1–99999 页之间' }
    }
    if (!validDate) return { ok: false, message: '阅读记录日期无效' }
    if (!Number.isInteger(input.minutes) || input.minutes < 1 || input.minutes > 1_440) {
      return { ok: false, message: '没有可关联的阅读时间' }
    }
    if (
      !Number.isInteger(input.startPage) || input.startPage < 1 ||
      !Number.isInteger(input.endPage) || input.endPage < input.startPage ||
      input.endPage > totalPages
    ) {
      return { ok: false, message: `页码需在 1–${totalPages} 之间，且结束页不能小于开始页` }
    }

    if (!existingBook) {
      setReadingBooks((previous) => {
        const next = upsertReadingBook(previous, bookTitle, totalPages)
        saveReadingBooks(next)
        return next
      })
    }

    setRecords((previous) => {
      const existing = getRecordByDate(previous, input.date)
      const record = appendReadingLogToRecord(existing, input.date, {
        id: input.id,
        bookTitle,
        startPage: input.startPage,
        endPage: input.endPage,
        minutes: input.minutes,
        completedAt: input.completedAt,
        linkedToExistingMinutes: true,
      })
      const next = upsertRecordStorage(previous, record)
      saveRecords(next)
      return next
    })

    return {
      ok: true,
      message: `已将 ${input.minutes} 分钟关联到《${bookTitle}》`,
    }
  }, [readingBooks])

  const exportRecords = useCallback(() => {
    setRecords((prev) => {
      downloadRecords(prev, categories, readingBooks)
      return prev
    })
  }, [categories, readingBooks])

  const importRecords = useCallback((json: string, mode: ImportMode) => {
    const imported = parseImportJson(json)
    if (imported.categories?.length) importCategoryDefinitions(imported.categories)
    if (imported.readingBooks) {
      setReadingBooks((previous) => {
        const next = mode === 'replace'
          ? imported.readingBooks ?? []
          : mergeReadingBooks(previous, imported.readingBooks ?? [])
        saveReadingBooks(next)
        return next
      })
    }
    setRecords((prev) => {
      const next = importRecordsStorage(prev, imported.records, mode)
      saveRecords(next)
      return next
    })
  }, [importCategoryDefinitions])

  const value = useMemo(
    () => ({
      records,
      readingBooks,
      upsertRecord,
      deleteRecord,
      getRecordByDate: getRecord,
      refresh,
      exportRecords,
      importRecords,
      setReadingBookTotalPages,
      renameReadingBook,
      updateReadingLogPages,
      deleteReadingLog,
      deleteReadingBook,
      addManualReadingSession,
      linkRecordedReadingSession,
    }),
    [records, readingBooks, upsertRecord, deleteRecord, getRecord, refresh, exportRecords, importRecords, setReadingBookTotalPages, renameReadingBook, updateReadingLogPages, deleteReadingLog, deleteReadingBook, addManualReadingSession, linkRecordedReadingSession],
  )

  return <RecordsContext.Provider value={value}>{children}</RecordsContext.Provider>
}

export function useRecords(): RecordsContextValue {
  const ctx = useContext(RecordsContext)
  if (!ctx) throw new Error('useRecords must be used within RecordsProvider')
  return ctx
}
