import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { lazy, Suspense, useEffect } from 'react'
import Layout from './components/Layout'
import Home from './pages/Home'
import { SUPPORTED_LANGS, VALID_TOOLS, VALID_PAGES } from './utils/routeValidation'

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
    children: [
      { index: true, element: <Home /> },
      { path: 'texas', element: <Suspense fallback={<Loading />}><Texas /></Suspense> },
      { path: 'georgia', element: <Suspense fallback={<Loading />}><Georgia /></Suspense> },
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
    document.querySelectorAll('[data-prerender]').forEach((el) => el.remove())
  }, [])
  return <RouterProvider router={router} />
}
