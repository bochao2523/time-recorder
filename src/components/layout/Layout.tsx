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
    <div className="flex min-h-svh w-full min-w-0 max-w-full flex-col">
      <header className="calico-surface sticky top-0 z-20 w-full min-w-0 max-w-full border-b border-terracotta/30">
        <div
          className="mx-auto flex min-h-11 max-w-4xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="depot-eyelet" aria-hidden />
            <div className="min-w-0">
              <p className="depot-display text-[10px] font-bold uppercase leading-none tracking-[0.12em] text-terracotta/70">TIME DEPOT</p>
              <h1 className="truncate text-xl font-extrabold leading-tight tracking-[-0.02em] text-terracotta sm:text-2xl">{pageTitle}</h1>
            </div>
          </div>
          <TimerHeaderButton hideIdle={pathname === '/'} />
        </div>
      </header>

      <main className="mx-auto w-full min-w-0 max-w-4xl flex-1 px-3 py-3 pb-[calc(6.25rem+env(safe-area-inset-bottom,0px))] sm:px-6 sm:py-6 sm:pb-28">
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
    <div className={`calico-surface stitched-light w-full min-w-0 max-w-full rounded-[14px] p-4 sm:p-5 ${className}`}>{children}</div>
  )
}

export { NavLink }
