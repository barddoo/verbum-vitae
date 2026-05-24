#!/usr/bin/env bun
// Converts bolls.life JSON dump to app format: {books, verses: [{b,c,v,t}]}
// Usage: bun scripts/convert-bolls.ts <input.json> <output-key>
// Example: bun scripts/convert-bolls.ts /tmp/bible-zips/NVIPT/NVIPT.json nvi

import { BOOKS } from '../packages/shared/src/bible'

const [inputPath, outKey] = process.argv.slice(2)
if (!inputPath || !outKey) {
  console.error('Usage: bun scripts/convert-bolls.ts <input.json> <output-key>')
  process.exit(1)
}

type BollsVerse = { book: number; chapter: number; verse: number; text: string }

const raw: BollsVerse[] = await Bun.file(inputPath).json()

const verses = raw.map((v) => ({
  b: v.book - 1, // bolls is 1-indexed, app is 0-indexed
  c: v.chapter,
  v: v.verse,
  t: v.text.replace(/<[^>]+>/g, '').trim(),
}))

const out = { books: [...BOOKS], verses }
const outPath = `app/public/bible-${outKey}.json`
await Bun.write(outPath, JSON.stringify(out))
console.log(`Wrote ${verses.length} verses → ${outPath}`)

// Compress
const proc = Bun.spawn(['brotli', '-k', '-f', outPath], { stdout: 'inherit', stderr: 'inherit' })
await proc.exited
console.log(`Compressed → ${outPath}.br`)
