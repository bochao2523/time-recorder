import { useEffect, useRef, useState } from 'react'
import { PageCard } from '../components/layout/Layout'
import { Toast } from '../components/common/Toast'
import { useRecords } from '../context/RecordsContext'
import { useCategories } from '../context/useCategories'
import { useBodyScrollLock } from '../hooks/useBodyScrollLock'
import { usePwaInstall } from '../hooks/usePwaInstall'
import { useTimer } from '../context/TimerContext'
import {
  disableTimerNotifications,
  getNotificationCapability,
  getPersistentStorageState,
  getTimerNotificationsEnabled,
  requestPersistentStorage,
  requestTimerNotifications,
  supportsPersistentStorage,
  syncTimerNotification,
  type NotificationCapability,
} from '../lib/pwa'
import type { ImportMode } from '../types'

export function SettingsPage() {
  const { records, exportRecords, importRecords } = useRecords()
  const { activeCategories, archivedCategories, addCategory, removeCategory, restoreCategory } = useCategories()
  const { sessions } = useTimer()
  const pwaInstall = usePwaInstall()
  const fileRef = useRef<HTMLInputElement>(null)
  const [pendingJson, setPendingJson] = useState<string | null>(null)
  const [importMode, setImportMode] = useState<ImportMode>('merge')
  const [categoryName, setCategoryName] = useState('')
  const [notificationCapability, setNotificationCapability] = useState<NotificationCapability>(() => getNotificationCapability())
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => (
    getTimerNotificationsEnabled() && getNotificationCapability() === 'granted'
  ))
  const [storageState, setStorageState] = useState<'checking' | 'protected' | 'available' | 'unsupported'>(() => (
    supportsPersistentStorage() ? 'checking' : 'unsupported'
  ))
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  })
  useBodyScrollLock(pendingJson !== null)

  useEffect(() => {
    let active = true
    void getPersistentStorageState().then((persisted) => {
      if (!active) return
      setStorageState(persisted === null ? 'unsupported' : persisted ? 'protected' : 'available')
    })
    return () => { active = false }
  }, [])

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

  const handleInstall = async () => {
    if (pwaInstall.installed) return
    if (pwaInstall.canPrompt) {
      const accepted = await pwaInstall.install()
      showToast(accepted ? '应用安装已开始' : '已取消安装', accepted ? 'success' : 'error')
      return
    }
    showToast(
      pwaInstall.ios
        ? '请点浏览器“分享”，再选“添加到主屏幕”'
        : '请打开浏览器菜单，选择“安装应用”或“添加到主屏幕”',
    )
  }

  const handleNotifications = async () => {
    if (notificationsEnabled) {
      await disableTimerNotifications()
      setNotificationsEnabled(false)
      showToast('锁屏计时提醒已关闭')
      return
    }
    if (notificationCapability === 'denied') {
      showToast('通知已被系统阻止，请在浏览器或手机设置中允许', 'error')
      return
    }
    const permission = await requestTimerNotifications()
    setNotificationCapability(permission)
    const enabled = permission === 'granted'
    setNotificationsEnabled(enabled)
    if (enabled) {
      await syncTimerNotification(sessions)
      showToast(sessions.length ? '锁屏计时提醒已开启' : '已开启，下次计时会显示提醒')
    } else {
      showToast(permission === 'unsupported' ? '当前浏览器不支持锁屏提醒' : '未获得通知权限', 'error')
    }
  }

  const handlePersistentStorage = async () => {
    const persisted = await requestPersistentStorage()
    if (persisted === null) {
      setStorageState('unsupported')
      showToast('当前浏览器不支持此项保护，请继续定期导出备份', 'error')
      return
    }
    setStorageState(persisted ? 'protected' : 'available')
    showToast(
      persisted ? '浏览器已尽量避免自动清理本站数据' : '浏览器未授予长期存储，请继续定期导出备份',
      persisted ? 'success' : 'error',
    )
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
        <div className="mb-2">
          <h2 className="text-base font-extrabold text-stone-800">安装与锁屏</h2>
          <p className="mt-1 text-xs leading-relaxed text-stone-light">装到主屏幕后更像独立应用；计时数据仍保存在这台设备。</p>
        </div>

        <div className="divide-y divide-dashed divide-terracotta/20">
          <div className="flex min-h-[4.75rem] items-center gap-3 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#0f6b56] text-white" aria-hidden>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></svg>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold text-stone-800">安装到主屏幕</p>
              <p className="mt-0.5 text-xs leading-relaxed text-stone-light">{pwaInstall.installed ? '正在以独立应用方式运行' : '支持离线打开，入口更稳定'}</p>
            </div>
            <button
              type="button"
              onClick={handleInstall}
              disabled={pwaInstall.installed}
              className="min-h-11 shrink-0 rounded-[10px] border border-terracotta/25 bg-calico px-3 text-sm font-extrabold text-terracotta active:bg-cream-dark disabled:border-[#0f6b56]/20 disabled:text-[#0f6b56] disabled:opacity-100"
            >
              {pwaInstall.installed ? '已安装' : pwaInstall.canPrompt ? '安装' : '查看方法'}
            </button>
          </div>

          <div className="flex min-h-[4.75rem] items-center gap-3 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#f04b6f] text-white" aria-hidden>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></svg>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold text-stone-800">锁屏计时提醒</p>
              <p className="mt-0.5 text-xs leading-relaxed text-stone-light">
                {notificationCapability === 'unsupported'
                  ? '需使用支持通知的已安装应用'
                  : notificationCapability === 'denied'
                    ? '权限已被系统阻止'
                    : notificationsEnabled ? '显示正在计时的任务摘要' : '开启后可从锁屏返回计时器'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleNotifications}
              className={`min-h-11 shrink-0 rounded-[10px] px-3 text-sm font-extrabold active:opacity-80 ${notificationsEnabled ? 'bg-[#0f6b56] text-white' : 'border border-terracotta/25 bg-calico text-terracotta'}`}
            >
              {notificationsEnabled ? '已开启' : notificationCapability === 'denied' ? '查看设置' : '开启'}
            </button>
          </div>

          <div className="flex min-h-[4.75rem] items-center gap-3 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#1467d4] text-white" aria-hidden>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></svg>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold text-stone-800">本地数据保护</p>
              <p className="mt-0.5 text-xs leading-relaxed text-stone-light">
                {storageState === 'protected'
                  ? '浏览器会尽量避免自动清理本站数据'
                  : storageState === 'unsupported' ? '当前浏览器不提供长期存储申请' : '降低长期不用时被自动清理的风险'}
              </p>
            </div>
            <button
              type="button"
              onClick={handlePersistentStorage}
              disabled={storageState === 'protected' || storageState === 'checking'}
              className="min-h-11 shrink-0 rounded-[10px] border border-terracotta/25 bg-calico px-3 text-sm font-extrabold text-terracotta active:bg-cream-dark disabled:text-[#1467d4] disabled:opacity-100"
            >
              {storageState === 'checking' ? '检查中' : storageState === 'protected' ? '已保护' : '申请保护'}
            </button>
          </div>
        </div>
      </PageCard>

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
