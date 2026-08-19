import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: '今日', end: true },
  { to: '/history', label: '记录', end: false },
  { to: '/dashboard', label: '统计', end: false },
  { to: '/settings', label: '设置', end: false },
]

export function NavBar() {
  return (
    <nav
      data-mobile-navigation
      aria-label="主导航"
      className="mobile-solid-surface fixed bottom-0 left-0 right-0 z-20 border-t border-cream-dark/80 bg-white/95 shadow-[0_-8px_28px_rgba(45,41,38,0.07)] backdrop-blur-md sm:bottom-5 sm:left-1/2 sm:right-auto sm:w-[28rem] sm:-translate-x-1/2 sm:rounded-2xl sm:border sm:border-white/80 sm:bg-white/90 sm:shadow-[0_16px_42px_rgba(45,41,38,0.16)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="mx-auto flex h-16 max-w-3xl items-stretch px-2 sm:h-14 sm:px-1.5">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `group flex min-w-0 flex-1 flex-col items-center justify-center rounded-xl text-xs transition-[color,background-color,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/30 active:scale-[0.97] sm:flex-row sm:gap-2 ${
                isActive ? 'font-semibold text-terracotta' : 'text-stone-light hover:bg-cream/75 hover:text-stone-800'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`flex h-8 min-w-10 items-center justify-center rounded-full transition-colors sm:h-9 sm:min-w-9 sm:rounded-xl ${isActive ? 'bg-terracotta/10' : 'group-hover:bg-white'}`}>
                  <TabIcon path={tab.to} />
                </span>
                <span className="mt-0.5 truncate sm:mt-0">{tab.label}</span>
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
    case '/dashboard':
      return <svg {...common}><path d="M3 3v18h18" /><path d="m7 15 4-4 3 3 5-6" /></svg>
    case '/settings':
      return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06-2.83 2.83-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21h-4v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06-2.83-2.83.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3v-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06 2.83-2.83.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3h4v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06 2.83 2.83-.06.06A1.65 1.65 0 0 0 19.4 9c.12.61.66 1.05 1.28 1.05H21v4h-.32c-.62 0-1.16.44-1.28 1Z" /></svg>
    default:
      return null
  }
}
