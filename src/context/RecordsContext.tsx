import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { DailyRecord, ImportMode } from '../types'
import {
  deleteRecord as deleteRecordStorage,
  downloadRecords,
  getRecordByDate,
  importRecords as importRecordsStorage,
  loadRecords,
  parseImportJson,
  saveRecords,
  upsertRecord as upsertRecordStorage,
} from '../lib/storage'

interface RecordsContextValue {
  records: DailyRecord[]
  upsertRecord: (record: DailyRecord) => void
  deleteRecord: (date: string) => void
  getRecordByDate: (date: string) => DailyRecord | undefined
  refresh: () => void
  exportRecords: () => void
  importRecords: (json: string, mode: ImportMode) => void
}

const RecordsContext = createContext<RecordsContextValue | null>(null)

export function RecordsProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<DailyRecord[]>(() => loadRecords())

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
  }, [])

  const exportRecords = useCallback(() => {
    setRecords((prev) => {
      downloadRecords(prev)
      return prev
    })
  }, [])

  const importRecords = useCallback((json: string, mode: ImportMode) => {
    const imported = parseImportJson(json)
    setRecords((prev) => {
      const next = importRecordsStorage(prev, imported, mode)
      saveRecords(next)
      return next
    })
  }, [])

  const value = useMemo(
    () => ({
      records,
      upsertRecord,
      deleteRecord,
      getRecordByDate: getRecord,
      refresh,
      exportRecords,
      importRecords,
    }),
    [records, upsertRecord, deleteRecord, getRecord, refresh, exportRecords, importRecords],
  )

  return <RecordsContext.Provider value={value}>{children}</RecordsContext.Provider>
}

export function useRecords(): RecordsContextValue {
  const ctx = useContext(RecordsContext)
  if (!ctx) throw new Error('useRecords must be used within RecordsProvider')
  return ctx
}
