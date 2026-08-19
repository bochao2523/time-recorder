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
    <div className="flex min-h-dvh w-full min-w-0 max-w-full flex-col bg-cream">
      <header className="mobile-solid-surface sticky top-0 z-10 w-full min-w-0 max-w-full border-b border-cream-dark/70 bg-white/95 backdrop-blur-sm">
        <div
          className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
        >
            <h1 className="truncate text-lg font-bold leading-tight tracking-tight text-stone-800">{pageTitle}</h1>
          <TimerHeaderButton />
        </div>
      </header>

      <main className="mx-auto w-full min-w-0 max-w-3xl flex-1 px-3.5 py-3 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]">
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
    <div className={`w-full min-w-0 max-w-full rounded-2xl border border-cream-dark/70 bg-white p-3.5 shadow-[0_6px_24px_rgba(48,44,41,0.05)] sm:p-5 ${className}`}>{children}</div>
  )
}

export { NavLink }
