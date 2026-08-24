import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { DailyRecord, ImportMode, ReadingBookMeta } from '../types'
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
    }),
    [records, readingBooks, upsertRecord, deleteRecord, getRecord, refresh, exportRecords, importRecords, setReadingBookTotalPages],
  )

  return <RecordsContext.Provider value={value}>{children}</RecordsContext.Provider>
}

export function useRecords(): RecordsContextValue {
  const ctx = useContext(RecordsContext)
  if (!ctx) throw new Error('useRecords must be used within RecordsProvider')
  return ctx
}
