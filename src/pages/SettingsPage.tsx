import { useRef, useState } from 'react'
import { PageCard } from '../components/layout/Layout'
import { Toast } from '../components/common/Toast'
import { useRecords } from '../context/RecordsContext'
import { useBodyScrollLock } from '../hooks/useBodyScrollLock'
import type { ImportMode } from '../types'

export function SettingsPage() {
  const { records, exportRecords, importRecords } = useRecords()
  const fileRef = useRef<HTMLInputElement>(null)
  const [pendingJson, setPendingJson] = useState<string | null>(null)
  const [importMode, setImportMode] = useState<ImportMode>('merge')
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  })
  useBodyScrollLock(pendingJson !== null)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type })
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setPendingJson(reader.result as string)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleImportConfirm = () => {
    if (!pendingJson) return
    try {
      importRecords(pendingJson, importMode)
      showToast('备份导入好啦 ✨')
    } catch (err) {
      showToast(err instanceof Error ? err.message : '导入失败', 'error')
    }
    setPendingJson(null)
  }

  return (
    <div className="space-y-3">
      <Toast
        message={toast.message}
        visible={toast.visible}
        type={toast.type}
        onHide={() => setToast((t) => ({ ...t, visible: false }))}
      />

      <section className="rounded-2xl bg-sage px-4 py-3.5 text-white shadow-[0_10px_30px_rgba(98,151,122,0.2)]">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></svg>
          </span>
          <div>
            <h2 className="font-semibold">数据保存在本机</h2>
            <p className="mt-1 text-xs leading-relaxed text-white/80">换手机或清理 Safari 数据前，请先导出备份。</p>
          </div>
        </div>
      </section>

      <PageCard>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-stone-800">备份与恢复</h2>
            <p className="mt-0.5 text-xs text-stone-light">导出文件可用于换机或恢复</p>
          </div>
          <span className="shrink-0 rounded-full bg-terracotta/10 px-3 py-1.5 text-xs font-semibold text-terracotta">{records.length} 天</span>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={exportRecords}
            className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-terracotta px-4 text-sm font-semibold text-white shadow-[0_6px_18px_rgba(223,104,75,0.2)] active:scale-[0.99] active:opacity-90"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></svg>
            导出备份
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-cream-dark bg-cream px-4 text-sm font-semibold text-stone-800 active:scale-[0.99] active:bg-cream-dark"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 15V3" /><path d="m7 8 5-5 5 5" /><path d="M5 21h14" /></svg>
            导入备份
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      </PageCard>

      <PageCard>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-terracotta/10 font-bold text-terracotta">T</span>
          <div>
          <h2 className="text-base font-semibold text-stone-800">时间记录</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-stone-light">
          简单记录每天的时间，不需要登录。
          </p>
          </div>
        </div>
      </PageCard>

      {pendingJson !== null && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-800/40 p-0 sm:items-center sm:p-4">
          <button type="button" aria-label="取消导入" className="absolute inset-0" onClick={() => setPendingJson(null)} />
          <div data-scroll-lock-allow className="relative z-10 w-full max-w-sm rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] shadow-xl sm:rounded-3xl">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-cream-dark sm:hidden" />
            <h3 className="text-base font-semibold text-stone-800">导入备份</h3>
            <p className="mt-1 text-sm text-stone-light">现有记录要怎么处理？</p>
            <div className="mt-4 space-y-2">
              <label className={`flex min-h-14 items-center gap-3 rounded-xl border px-3 text-sm ${importMode === 'merge' ? 'border-terracotta bg-terracotta/5' : 'border-cream-dark'}`}>
                <input
                  type="radio"
                  name="importMode"
                  className="accent-terracotta"
                  checked={importMode === 'merge'}
                  onChange={() => setImportMode('merge')}
                />
                <span><span className="block font-medium text-stone-800">保留并合并</span><span className="block text-xs text-stone-light">保留现有记录，重复日期使用备份</span></span>
              </label>
              <label className={`flex min-h-14 items-center gap-3 rounded-xl border px-3 text-sm ${importMode === 'replace' ? 'border-terracotta bg-terracotta/5' : 'border-cream-dark'}`}>
                <input
                  type="radio"
                  name="importMode"
                  className="accent-terracotta"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                />
                <span><span className="block font-medium text-stone-800">全部替换</span><span className="block text-xs text-stone-light">删除现有记录，只保留备份</span></span>
              </label>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPendingJson(null)}
                className="min-h-11 rounded-xl bg-cream px-4 text-sm font-medium text-stone-800 active:bg-cream-dark"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleImportConfirm}
                className="min-h-11 rounded-xl bg-terracotta px-4 text-sm font-semibold text-white active:opacity-90"
              >
                导入
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
