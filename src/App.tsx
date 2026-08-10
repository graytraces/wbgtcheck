import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { lazy, Suspense, useEffect } from 'react'
import Layout from './components/Layout'
import RouteErrorFallback from './components/RouteErrorFallback'
import Home from './pages/Home'
import { SUPPORTED_LANGS, VALID_TOOLS, VALID_PAGES } from './utils/routeValidation'
import { clearPrerenderedCopy } from './utils/prerenderCleanup'

function detectLang(): string {
  const raw = navigator.languages?.length ? navigator.languages : [navigator.language]
  const langs = raw.map((l) => l.trim().split(';')[0].trim().toLowerCase().split('-')[0])
  for (const lang of langs) {
    if ((SUPPORTED_LANGS as readonly string[]).includes(lang)) return lang
  }
  return 'en'
}

const Texas = lazy(() => import('./pages/Texas'))
const Georgia = lazy(() => import('./pages/Georgia'))
const SouthCarolina = lazy(() => import('./pages/SouthCarolina'))
const Tennessee = lazy(() => import('./pages/Tennessee'))
const Iowa = lazy(() => import('./pages/Iowa'))
const NorthCarolina = lazy(() => import('./pages/NorthCarolina'))
const NewYork = lazy(() => import('./pages/NewYork'))
const Virginia = lazy(() => import('./pages/Virginia'))
const Massachusetts = lazy(() => import('./pages/Massachusetts'))
const Florida = lazy(() => import('./pages/Florida'))
const California = lazy(() => import('./pages/California'))
const Kentucky = lazy(() => import('./pages/Kentucky'))
const WbgtVsHeatIndex = lazy(() => import('./pages/WbgtVsHeatIndex'))
const States = lazy(() => import('./pages/States'))
const WashingtonAir = lazy(() => import('./pages/WashingtonAir'))
const OregonAir = lazy(() => import('./pages/OregonAir'))
const CaliforniaAir = lazy(() => import('./pages/CaliforniaAir'))
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'))
const Disclaimer = lazy(() => import('./pages/Disclaimer'))
const NotFound = lazy(() => import('./pages/NotFound'))

const Loading = () => (
  <div className="flex items-center justify-center p-8 text-ink-muted">Loading…</div>
)

// Bare-path redirects mirror the worker's 302 behavior for client-side entry.
// Keep slugs in sync with routeValidation.ts (VALID_TOOLS ∪ VALID_PAGES).
const bareSlugs = [...VALID_TOOLS, ...VALID_PAGES]

const router = createBrowserRouter([
  { path: '/', element: <Navigate to={`/${detectLang()}`} replace /> },
  ...bareSlugs.map((slug) => ({
    path: `/${slug}`,
    element: <Navigate to={`/${detectLang()}/${slug}`} replace />,
  })),
  {
    path: '/:lang',
    element: <Layout />,
    // Without this, a failed lazy chunk (stale deploy) lands on react-router's
    // raw default error page — near-blank on a phone. See staleRecovery.ts.
    errorElement: <RouteErrorFallback />,
    children: [
      { index: true, element: <Home /> },
      { path: 'texas', element: <Suspense fallback={<Loading />}><Texas /></Suspense> },
      { path: 'georgia', element: <Suspense fallback={<Loading />}><Georgia /></Suspense> },
      { path: 'south-carolina', element: <Suspense fallback={<Loading />}><SouthCarolina /></Suspense> },
      { path: 'tennessee', element: <Suspense fallback={<Loading />}><Tennessee /></Suspense> },
      { path: 'iowa', element: <Suspense fallback={<Loading />}><Iowa /></Suspense> },
      { path: 'north-carolina', element: <Suspense fallback={<Loading />}><NorthCarolina /></Suspense> },
      { path: 'new-york', element: <Suspense fallback={<Loading />}><NewYork /></Suspense> },
      { path: 'virginia', element: <Suspense fallback={<Loading />}><Virginia /></Suspense> },
      { path: 'massachusetts', element: <Suspense fallback={<Loading />}><Massachusetts /></Suspense> },
      { path: 'florida', element: <Suspense fallback={<Loading />}><Florida /></Suspense> },
      { path: 'california', element: <Suspense fallback={<Loading />}><California /></Suspense> },
      { path: 'kentucky', element: <Suspense fallback={<Loading />}><Kentucky /></Suspense> },
      { path: 'wbgt-vs-heat-index', element: <Suspense fallback={<Loading />}><WbgtVsHeatIndex /></Suspense> },
      { path: 'states', element: <Suspense fallback={<Loading />}><States /></Suspense> },
      { path: 'washington-air-quality', element: <Suspense fallback={<Loading />}><WashingtonAir /></Suspense> },
      { path: 'oregon-air-quality', element: <Suspense fallback={<Loading />}><OregonAir /></Suspense> },
      { path: 'california-air-quality', element: <Suspense fallback={<Loading />}><CaliforniaAir /></Suspense> },
      { path: 'privacy', element: <Suspense fallback={<Loading />}><PrivacyPolicy /></Suspense> },
      { path: 'disclaimer', element: <Suspense fallback={<Loading />}><Disclaimer /></Suspense> },
      { path: '*', element: <Suspense fallback={<Loading />}><NotFound /></Suspense> },
    ],
  },
  { path: '*', element: <Navigate to={`/${detectLang()}`} replace /> },
])

export default function App() {
  useEffect(() => {
    // Reaching here means React committed, so the bundle loaded: cancel the
    // blank-page failsafe armed in index.html before it can reveal the
    // prerendered copy, then drop that copy as before.
    const w = window as Window & { __wbgtBoot?: ReturnType<typeof setTimeout> }
    if (w.__wbgtBoot !== undefined) {
      clearTimeout(w.__wbgtBoot)
      delete w.__wbgtBoot
    }
    // Only set if a very slow boot already tripped the timer; harmless
    // otherwise, and it keeps the two states from disagreeing.
    document.documentElement.classList.remove('boot-failed')
    // See prerenderCleanup: the selector there is deliberately qualified.
    clearPrerenderedCopy()
  }, [])
  return <RouterProvider router={router} />
}
