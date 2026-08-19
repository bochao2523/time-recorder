import { lazy, Suspense } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'

const TodayPage = lazy(() => import('./pages/TodayPage').then((module) => ({ default: module.TodayPage })))
const HistoryPage = lazy(() => import('./pages/HistoryPage').then((module) => ({ default: module.HistoryPage })))
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })))

function PageLoader() {
  return (
    <div className="flex min-h-52 items-center justify-center" role="status" aria-label="页面加载中">
      <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-cream-dark border-t-terracotta" />
    </div>
  )
}

function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

export function AppRouter() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<LazyPage><TodayPage /></LazyPage>} />
          <Route path="/history" element={<LazyPage><HistoryPage /></LazyPage>} />
          <Route path="/dashboard" element={<LazyPage><DashboardPage /></LazyPage>} />
          <Route path="/settings" element={<LazyPage><SettingsPage /></LazyPage>} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
