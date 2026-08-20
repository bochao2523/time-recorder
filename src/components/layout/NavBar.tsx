import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: '今日', end: true },
  { to: '/reading', label: '阅读', end: false },
  { to: '/history', label: '记录', end: false },
  { to: '/dashboard', label: '统计', end: false },
  { to: '/settings', label: '设置', end: false },
]

export function NavBar() {
  return (
    <nav
      data-mobile-navigation
      aria-label="主导航"
      className="depot-cloth fixed bottom-0 left-0 right-0 z-20 border-t border-chrome-yellow/60 shadow-[0_-10px_26px_rgba(8,43,34,0.18)] sm:bottom-5 sm:left-1/2 sm:right-auto sm:w-[28rem] sm:-translate-x-1/2 sm:overflow-hidden sm:rounded-[14px] sm:border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="mx-auto flex h-[4.5rem] max-w-3xl items-stretch sm:h-16">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `group flex min-w-0 flex-1 flex-col items-center justify-center border-r border-chrome-yellow/25 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-chrome-yellow last:border-r-0 sm:flex-row sm:gap-2 ${
                isActive ? 'bg-chrome-yellow font-extrabold text-terracotta' : 'text-cream hover:bg-white/10 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`flex h-8 min-w-10 items-center justify-center ${isActive ? '' : 'opacity-85'}`}>
                  <TabIcon path={tab.to} />
                </span>
                <span className="depot-display mt-0.5 truncate text-[13px] font-bold tracking-[0.04em] sm:mt-0">{tab.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

function TabIcon({ path }: { path: string }) {
  const common = {
    width: 19,
    height: 19,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  switch (path) {
    case '/':
      return <svg {...common}><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" /></svg>
    case '/history':
      return <svg {...common}><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
    case '/reading':
      return <svg {...common}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></svg>
    case '/dashboard':
      return <svg {...common}><path d="M3 3v18h18" /><path d="m7 15 4-4 3 3 5-6" /></svg>
    case '/settings':
      return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06-2.83 2.83-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21h-4v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06-2.83-2.83.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3v-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06 2.83-2.83.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3h4v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06 2.83 2.83-.06.06A1.65 1.65 0 0 0 19.4 9c.12.61.66 1.05 1.28 1.05H21v4h-.32c-.62 0-1.16.44-1.28 1Z" /></svg>
    default:
      return null
  }
}
