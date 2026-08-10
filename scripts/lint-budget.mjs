/**
 * Lint as a ratchet rather than an all-or-nothing gate.
 *
 * `npm run lint` was in no gate at all, so 11 errors had accumulated without
 * anyone seeing them — including one added by the batch that found this. A
 * plain `eslint .` in `npm test` was the obvious fix and would have failed
 * immediately, which means it would have been removed again.
 *
 * So: a budget. New errors fail the build today. The known ones are listed
 * below with the reason they are still here, and the budget can only go DOWN
 * — fixing one and leaving the number alone also fails, with the new number in
 * the message.
 *
 * The remaining six are all react-hooks/set-state-in-effect in hooks that
 * drive the verdict, the log and the air card. Each is a real finding and each
 * needs its own behavioural change (lazy initial state, or a subscription that
 * does not seed synchronously). That is a batch of its own, not a drive-by in
 * a copy-and-layout pass, and getting one of them wrong changes what flag a
 * reader sees.
 */
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** Lower this when you fix one. It may never rise. */
const BUDGET = 6

let raw = ''
try {
  raw = execFileSync('npx', ['eslint', '.', '-f', 'json'], {
    cwd: REPO,
    encoding: 'utf-8',
    maxBuffer: 32 * 1024 * 1024,
  })
} catch (err) {
  // eslint exits non-zero when it reports errors; the JSON is still on stdout.
  raw = err.stdout ?? ''
  if (!raw) {
    console.error('lint-budget: eslint produced no output\n', err.stderr ?? err.message)
    process.exit(1)
  }
}

const results = JSON.parse(raw)
const errors = []
for (const file of results) {
  for (const message of file.messages) {
    if (message.severity !== 2) continue
    errors.push({
      file: file.filePath.replace(`${REPO}/`, ''),
      line: message.line,
      rule: message.ruleId,
    })
  }
}

const byRule = new Map()
for (const e of errors) byRule.set(e.rule, (byRule.get(e.rule) ?? 0) + 1)

if (errors.length > BUDGET) {
  console.error(`\nlint budget exceeded: ${errors.length} errors, budget ${BUDGET}\n`)
  for (const e of errors) console.error(`  ${e.file}:${e.line}  ${e.rule}`)
  console.error('\nFix the new one rather than raising the budget.\n')
  process.exit(1)
}

if (errors.length < BUDGET) {
  console.error(
    `\nlint budget is stale: ${errors.length} errors remain but the budget is ${BUDGET}.\n` +
      `Lower BUDGET to ${errors.length} in scripts/lint-budget.mjs so it cannot drift back up.\n`,
  )
  process.exit(1)
}

const summary = [...byRule].map(([rule, n]) => `${n} ${rule}`).join(', ')
console.log(`lint budget: ${errors.length}/${BUDGET} (${summary})`)
