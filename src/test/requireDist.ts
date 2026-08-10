import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Guards that read dist/ used to be `it.skipIf(!existsSync(DIST))`, and
 * `npm test` does not build. On a fresh clone that reported
 * `437 passed | 5 skipped` while the summary line said `36 passed (36)` — the
 * verification degraded silently rather than failing.
 *
 * What was skipping: the scan for a personal email address in built HTML, the
 * ban on a static gtag tag, and three reachability guards. A privacy check and
 * a GA check, quietly absent.
 *
 * Worse than absent: STALE. Removing all three air-quality guide links from
 * the prerender and running `npm test` without rebuilding passed 442/442,
 * because the assertions read the previous build's HTML. A guard that reads a
 * stale artifact is not a guard.
 *
 * So these throw now instead of skipping, and `pretest` builds. Running vitest
 * directly still works — it just tells you to build first.
 */

const DIST = join(process.cwd(), 'dist')

/** Newest mtime under a directory, ignoring what the build itself writes. */
function newestMtime(dir: string, skip: (name: string) => boolean = () => false): number {
  let newest = 0
  const walk = (current: string) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (skip(entry.name)) continue
      const full = join(current, entry.name)
      if (entry.isDirectory()) walk(full)
      else newest = Math.max(newest, statSync(full).mtimeMs)
    }
  }
  walk(dir)
  return newest
}

function oldestHtmlMtime(dir: string): number {
  let oldest = Infinity
  const walk = (current: string) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name.endsWith('.html')) oldest = Math.min(oldest, statSync(full).mtimeMs)
    }
  }
  walk(dir)
  return oldest
}

/**
 * Call at the top of any test that asserts against built output. Throws with
 * the command to run rather than skipping.
 */
export function requireFreshDist(): string {
  if (!existsSync(DIST)) {
    throw new Error(
      'dist/ is missing and this test asserts against built HTML.\n' +
        'Run `npm run build` first (`npm test` does this for you via pretest).',
    )
  }

  const built = oldestHtmlMtime(DIST)
  const sources = Math.max(
    newestMtime(join(process.cwd(), 'src'), (name) => name === '__tests__'),
    newestMtime(join(process.cwd(), 'scripts')),
    statSync(join(process.cwd(), 'index.html')).mtimeMs,
  )

  if (sources > built) {
    throw new Error(
      'dist/ is older than the sources it was built from, so this test would ' +
        'assert against the PREVIOUS build.\n' +
        'Run `npm run build`.',
    )
  }
  return DIST
}
