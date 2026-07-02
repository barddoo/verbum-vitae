#!/usr/bin/env bun
/**
 * Fetches English Bible translations (KJV and WEB) from bolls.life
 * and writes them to app/public/ in the app's format.
 *
 * Usage:
 *   bun scripts/fetch-bibles-en.ts
 *   bun scripts/fetch-bibles-en.ts kjv   # only KJV
 *   bun scripts/fetch-bibles-en.ts web   # only WEB
 */

const targets = [
  { bollsCode: 'KJV', outKey: 'kjv' },
  { bollsCode: 'WEB', outKey: 'web' },
]

const filter = process.argv[2]
const toFetch = filter ? targets.filter((t) => t.outKey === filter) : targets

if (toFetch.length === 0) {
  console.error(`Unknown key "${filter}". Valid: ${targets.map((t) => t.outKey).join(', ')}`)
  process.exit(1)
}

for (const { bollsCode, outKey } of toFetch) {
  console.log(`\n=== Fetching ${bollsCode} → bible-${outKey}.json ===`)
  const proc = Bun.spawn(['bun', 'scripts/fetch-bible.ts', bollsCode, outKey], {
    stdout: 'inherit',
    stderr: 'inherit',
    cwd: process.cwd(),
  })
  const code = await proc.exited
  if (code !== 0) {
    console.error(`Failed to fetch ${bollsCode} (exit ${code})`)
    process.exit(code)
  }
}

console.log('\nDone. English Bibles ready in app/public/.')
