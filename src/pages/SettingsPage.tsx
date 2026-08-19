import { useRef, useState } from 'react'
import { PageCard } from '../components/layout/Layout'
import { Toast } from '../components/common/Toast'
import { useRecords } from '../context/RecordsContext'
import { useCategories } from '../context/useCategories'
import { useBodyScrollLock } from '../hooks/useBodyScrollLock'
import type { ImportMode } from '../types'

export function SettingsPage() {
  const { records, exportRecords, importRecords } = useRecords()
  const { activeCategories, archivedCategories, addCategory, removeCategory, restoreCategory } = useCategories()
  const fileRef = useRef<HTMLInputElement>(null)
  const [pendingJson, setPendingJson] = useState<string | null>(null)
  const [importMode, setImportMode] = useState<ImportMode>('merge')
  const [categoryName, setCategoryName] = useState('')
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
      showToast('备份导入成功')
    } catch (err) {
      showToast(err instanceof Error ? err.message : '导入失败', 'error')
    }
    setPendingJson(null)
  }

  const handleAddCategory = () => {
    const result = addCategory(categoryName)
    showToast(result.message, result.ok ? 'success' : 'error')
    if (result.ok) setCategoryName('')
  }

  const handleRemoveCategory = (id: string) => {
    const result = removeCategory(id)
    showToast(result.message, result.ok ? 'success' : 'error')
  }

  const handleRestoreCategory = (id: string) => {
    const result = restoreCategory(id)
    showToast(result.message, result.ok ? 'success' : 'error')
  }

  return (
    <div className="space-y-3">
      <Toast
        message={toast.message}
        visible={toast.visible}
        type={toast.type}
        onHide={() => setToast((t) => ({ ...t, visible: false }))}
      />

      <section className="depot-cloth stitched-panel rounded-[14px] px-4 py-4 text-chrome-yellow">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-chrome-yellow/45">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></svg>
          </span>
          <div>
            <h2 className="font-semibold">数据保存在本机</h2>
            <p className="mt-1 text-xs leading-relaxed text-chrome-yellow/75">换手机或清理 Safari 数据前，请先导出备份。</p>
          </div>
        </div>
      </section>

      <PageCard>
        <div className="mb-4">
          <h2 className="text-base font-extrabold text-stone-800">任务大类</h2>
          <p className="mt-1 text-xs leading-relaxed text-stone-light">决定“今天”和计时器里显示哪些大类。删除不会清掉过去的记录。</p>
        </div>

        <div className="space-y-2" aria-label="正在使用的任务大类">
          {activeCategories.map((category) => (
            <div key={category.id} className="flex min-h-12 items-center gap-3 rounded-[10px] border border-terracotta/18 bg-calico px-3">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: category.color }} aria-hidden />
              <span className="min-w-0 flex-1 truncate text-sm font-bold text-stone-800">{category.label}</span>
              <button
                type="button"
                onClick={() => handleRemoveCategory(category.id)}
                disabled={activeCategories.length <= 1}
                className="min-h-11 shrink-0 rounded-[10px] px-3 text-sm font-bold text-stone-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chrome-yellow active:bg-cream-dark disabled:cursor-not-allowed disabled:opacity-30"
                aria-label={`删除大类「${category.label}」`}
              >
                删除
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 border-t border-dashed border-terracotta/25 pt-4">
          <label htmlFor="new-category-name" className="text-sm font-bold text-stone-800">添加新大类</label>
          <div className="mt-2 grid grid-cols-[minmax(0,1fr)_5.5rem] gap-2">
            <input
              id="new-category-name"
              type="text"
              value={categoryName}
              maxLength={12}
              enterKeyHint="done"
              onChange={(event) => setCategoryName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleAddCategory()
              }}
              placeholder="例如：弹琴"
              className="min-h-12 min-w-0 rounded-[10px] border border-terracotta/25 bg-calico px-3 text-base font-medium text-stone-800 placeholder:text-stone-400 focus:border-terracotta focus:bg-white focus:outline-none focus:ring-2 focus:ring-chrome-yellow/55"
            />
            <button
              type="button"
              onClick={handleAddCategory}
              className="min-h-12 rounded-[10px] bg-chrome-yellow px-3 text-sm font-extrabold text-terracotta active:bg-[#e8bf00]"
            >
              添加
            </button>
          </div>
        </div>

        {archivedCategories.length > 0 && (
          <div className="mt-4 border-t border-dashed border-terracotta/25 pt-4">
            <p className="text-xs font-bold text-stone-light">已删除 · 历史数据仍保留</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {archivedCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleRestoreCategory(category.id)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-terracotta/20 bg-calico px-3 text-sm font-bold text-terracotta active:bg-cream-dark"
                >
                  <span className="h-2.5 w-2.5 rounded-full opacity-60" style={{ backgroundColor: category.color }} aria-hidden />
                  恢复 {category.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </PageCard>

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
            className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-[10px] bg-chrome-yellow px-4 text-sm font-extrabold text-terracotta shadow-[0_6px_16px_rgba(8,43,34,0.12)] active:bg-[#e8bf00]"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></svg>
            导出备份
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-[10px] border border-terracotta/30 bg-calico px-4 text-sm font-bold text-terracotta active:bg-cream-dark"
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
