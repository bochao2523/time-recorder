import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { DailyRecord, ImportMode, ReadingBookMeta } from '../types'
import { removeReadingSessions, updateReadingSessionPages } from '../lib/categoryItems'
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
    }),
    [records, readingBooks, upsertRecord, deleteRecord, getRecord, refresh, exportRecords, importRecords, setReadingBookTotalPages, renameReadingBook, updateReadingLogPages, deleteReadingLog, deleteReadingBook],
  )

  return <RecordsContext.Provider value={value}>{children}</RecordsContext.Provider>
}

export function useRecords(): RecordsContextValue {
  const ctx = useContext(RecordsContext)
  if (!ctx) throw new Error('useRecords must be used within RecordsProvider')
  return ctx
}
