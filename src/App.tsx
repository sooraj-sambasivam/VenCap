import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { Skeleton } from '@/components/ui/skeleton'
import NavBar from '@/components/NavBar'
import { KeyboardShortcuts } from '@/components/KeyboardShortcuts'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import Index from '@/pages/Index'

const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Deals = lazy(() => import('@/pages/Deals'))
const Portfolio = lazy(() => import('@/pages/Portfolio'))
const Incubator = lazy(() => import('@/pages/Incubator'))
const Lab = lazy(() => import('@/pages/Lab'))
const News = lazy(() => import('@/pages/News'))
const Reports = lazy(() => import('@/pages/Reports'))
const Results = lazy(() => import('@/pages/Results'))

function PageLoader() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-28 rounded-lg" />
        <Skeleton className="h-28 rounded-lg" />
        <Skeleton className="h-28 rounded-lg" />
        <Skeleton className="h-28 rounded-lg" />
      </div>
      <Skeleton className="h-64 rounded-lg" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <TooltipProvider>
        <NavBar />
        <div className="min-h-screen bg-background pt-14 text-foreground">
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/deals" element={<Deals />} />
                <Route path="/portfolio" element={<Portfolio />} />
                <Route path="/incubator" element={<Incubator />} />
                <Route path="/lab" element={<Lab />} />
                <Route path="/news" element={<News />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/results" element={<Results />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </div>
        <KeyboardShortcuts />
        <Toaster />
      </TooltipProvider>
    </BrowserRouter>
  )
}

export default App
