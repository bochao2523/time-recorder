import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { NavBar } from './NavBar'
import { TimerFloatingBar } from '../timer/TimerFloatingBar'
import { TimerHeaderButton } from '../timer/TimerHeaderButton'
import { TimerModal } from '../timer/TimerModal'
import { TimerNotice } from '../timer/TimerNotice'

export function Layout() {
  const { pathname } = useLocation()
  const pageTitle = pathname.startsWith('/history')
    ? '记录'
    : pathname.startsWith('/dashboard')
      ? '统计'
      : pathname.startsWith('/settings')
        ? '设置'
        : '今天'

  return (
    <div className="flex min-h-dvh w-full min-w-0 max-w-full flex-col">
      <header className="mobile-solid-surface sticky top-0 z-20 w-full min-w-0 max-w-full border-b border-cream-dark/75 bg-[#fbfaf8]/92 backdrop-blur-md">
        <div
          className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="hidden h-8 w-8 items-center justify-center rounded-xl bg-stone-800 text-sm font-bold text-white shadow-[0_5px_14px_rgba(45,41,38,0.18)] sm:flex">时</span>
            <h1 className="truncate text-lg font-bold leading-tight tracking-[-0.02em] text-stone-800 sm:text-xl">{pageTitle}</h1>
          </div>
          <TimerHeaderButton />
        </div>
      </header>

      <main className="mx-auto w-full min-w-0 max-w-4xl flex-1 px-3.5 py-4 pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] sm:px-6 sm:py-6 sm:pb-28">
        <Outlet />
      </main>

      <TimerNotice />
      <TimerFloatingBar />
      <TimerModal />
      <NavBar />
    </div>
  )
}

/** 页面卡片容器 */
export function PageCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`w-full min-w-0 max-w-full rounded-2xl bg-white p-4 shadow-[0_10px_30px_rgba(45,41,38,0.075)] ring-1 ring-stone-800/[0.06] sm:p-5 ${className}`}>{children}</div>
  )
}

export { NavLink }
