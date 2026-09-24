import { lazy, Suspense } from 'react'
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { PageErrorBoundary } from './components/common/PageErrorBoundary'

const TodayPage = lazy(() => import('./pages/TodayPage').then((module) => ({ default: module.TodayPage })))
const ReadingPage = lazy(() => import('./pages/ReadingPage').then((module) => ({ default: module.ReadingPage })))
const ReadingBookPage = lazy(() => import('./pages/ReadingBookPage').then((module) => ({ default: module.ReadingBookPage })))
const HistoryPage = lazy(() => import('./pages/HistoryPage').then((module) => ({ default: module.HistoryPage })))
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })))

function PageLoader() {
  return (
    <div className="calico-surface stitched-light flex min-h-52 items-center justify-center rounded-[14px]" role="status" aria-label="页面加载中">
      <div className="flex items-center gap-3 text-sm font-bold text-terracotta">
        <span className="depot-eyelet" aria-hidden />
        正在准备页面
      </div>
    </div>
  )
}

function LazyPage({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  return (
    <PageErrorBoundary key={location.pathname}>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </PageErrorBoundary>
  )
}

export function AppRouter() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<LazyPage><TodayPage /></LazyPage>} />
          <Route path="/reading" element={<LazyPage><ReadingPage /></LazyPage>} />
          <Route path="/reading/book" element={<LazyPage><ReadingBookPage /></LazyPage>} />
          <Route path="/history" element={<LazyPage><HistoryPage /></LazyPage>} />
          <Route path="/dashboard" element={<LazyPage><DashboardPage /></LazyPage>} />
          <Route path="/settings" element={<LazyPage><SettingsPage /></LazyPage>} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
