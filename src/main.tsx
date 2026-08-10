import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n'
import './index.css'
import App from './App.tsx'
import { reloadOnceForStaleAssets } from './utils/staleRecovery'
// Side effect only: Chrome fires `beforeinstallprompt` once, shortly after
// load, and the component that wants it does not mount until a verdict has
// rendered. Registering here rather than relying on the component's own import
// keeps the listener in place before the first paint, whatever the bundler
// later decides to split.
import './utils/installPrompt'

// A deploy while this tab sat open removes the hashed assets its HTML points
// at. Three nets, all funneled through the same one-shot reload guard:
// vite's preload-failure event (lazy route chunks), bfcache restores that
// come back to an empty root, and an entry stylesheet that is linked but
// never applied (cached JS + evicted CSS renders the app unstyled).
window.addEventListener('vite:preloadError', (event) => {
  if (reloadOnceForStaleAssets()) event.preventDefault()
})
window.addEventListener('pageshow', (event) => {
  if (event.persisted && document.getElementById('root')?.childElementCount === 0) {
    reloadOnceForStaleAssets()
  }
})
window.addEventListener('load', () => {
  const linked = document.querySelector('link[rel="stylesheet"][href*="/assets/"]')
  const applied = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-flag-green')
    .trim()
  if (linked && !applied) reloadOnceForStaleAssets()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
