#!/usr/bin/env bun
/**
 * Fetches a Bible translation from bolls.life and outputs it in the app's format.
 *
 * Usage:
 *   bun scripts/fetch-bible.ts <bolls-translation-code> <output-key>
 *
 * Examples:
 *   bun scripts/fetch-bible.ts NVI nvi
 *   bun scripts/fetch-bible.ts NVT nvt
 *   bun scripts/fetch-bible.ts A21 a21
 *
 * To list all available PT translations first, run with --list:
 *   bun scripts/fetch-bible.ts --list
 *
 * Output: app/public/bible-{output-key}.json  (+ compressed .br)
 */

const BASE = 'https://bolls.life'

type BollsBook = { bookid: number; name: string; chapters: number }
type BollsVerse = { pk: number; verse: number; text: string }

async function listTranslations() {
  const res = await fetch(`${BASE}/static/bolls/app/views/languages-translations.json`)
  const data = (await res.json()) as Record<string, string[]>
  const ptKeys = ['Portuguese', 'Português', 'Brazilian', 'Brazil', 'pt']
  for (const [lang, translations] of Object.entries(data)) {
    if (ptKeys.some((k) => lang.toLowerCase().includes(k.toLowerCase()))) {
      console.log(`\n${lang}:`, translations.join(', '))
    }
  }
  console.log('\nAll languages available above. Pass the translation code to fetch.')
}

async function fetchTranslation(code: string, outKey: string) {
  console.log(`Fetching books for ${code}...`)
  const booksRes = await fetch(`${BASE}/get-books/${code}/`)
  if (!booksRes.ok) throw new Error(`Books fetch failed: ${booksRes.status} — check translation code`)
  const books: BollsBook[] = await booksRes.json()

  const bookNames = books.map((b) => b.name)
  const verses: { b: number; c: number; v: number; t: string }[] = []

  for (let bi = 0; bi < books.length; bi++) {
    const book = books[bi]
    process.stdout.write(`\r[${bi + 1}/${books.length}] ${book.name.padEnd(30)}`)

    for (let ch = 1; ch <= book.chapters; ch++) {
      const res = await fetch(`${BASE}/get-chapter/${code}/${book.bookid}/${ch}/`)
      if (!res.ok) {
        console.warn(`\nSkipping ${book.name} ${ch}: ${res.status}`)
        continue
      }
      const chVerses: BollsVerse[] = await res.json()
      for (const v of chVerses) {
        verses.push({
          b: bi,
          c: ch,
          v: v.verse,
          t: v.text
            .replace(/<sup[^>]*>.*?<\/sup>/gi, '')
            .replace(/<[^>]+>/g, '')
            .trim(),
        })
      }
      // polite delay — avoid hammering the API
      await Bun.sleep(50)
    }
  }

  console.log(`\nFetched ${verses.length} verses across ${bookNames.length} books.`)

  const outPath = `app/public/bible-${outKey}.json`
  await Bun.write(outPath, JSON.stringify({ books: bookNames, verses }))
  console.log(`Wrote ${outPath}`)

  // Compressed .br version
  const proc = Bun.spawn(['brotli', '-k', '-f', outPath], { stdout: 'inherit', stderr: 'inherit' })
  await proc.exited
  console.log(`Compressed ${outPath}.br`)
}

const args = process.argv.slice(2)

if (args[0] === '--list' || args.length === 0) {
  await listTranslations()
} else {
  const [code, outKey] = args
  if (!outKey) {
    console.error('Usage: bun scripts/fetch-bible.ts <bolls-code> <output-key>')
    console.error('Example: bun scripts/fetch-bible.ts NVI nvi')
    process.exit(1)
  }
  await fetchTranslation(code, outKey)
}
