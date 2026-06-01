// Build catechism JSON files from raw fetched text
// Run: bun run scripts/build-catechisms.ts

const HEIDELBERG_URL = 'https://www.monergismo.com/textos/catecismos/catecismo_heidelberg.htm'
const WESTMINSTER_URL = 'https://pt.ligonier.org/recursos/credos-e-confissoes/o-breve-catecismo-de-westminster/'

const OUTPUT_DIR = `${import.meta.dirname}/../app/public/textos`

function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&agrave;': 'à',
    '&aacute;': 'á',
    '&acirc;': 'â',
    '&atilde;': 'ã',
    '&auml;': 'ä',
    '&eacute;': 'é',
    '&ecirc;': 'ê',
    '&egrave;': 'è',
    '&euml;': 'ë',
    '&iacute;': 'í',
    '&icirc;': 'î',
    '&igrave;': 'ì',
    '&oacute;': 'ó',
    '&ocirc;': 'ô',
    '&otilde;': 'õ',
    '&ouml;': 'ö',
    '&uacute;': 'ú',
    '&ucirc;': 'û',
    '&ugrave;': 'ù',
    '&uuml;': 'ü',
    '&ccedil;': 'ç',
    '&yacute;': 'ý',
    '&Aacute;': 'Á',
    '&Agrave;': 'À',
    '&Acirc;': 'Â',
    '&Atilde;': 'Ã',
    '&Eacute;': 'É',
    '&Ecirc;': 'Ê',
    '&Iacute;': 'Í',
    '&Oacute;': 'Ó',
    '&Ocirc;': 'Ô',
    '&Otilde;': 'Õ',
    '&Uacute;': 'Ú',
    '&Ucirc;': 'Û',
    '&Ccedil;': 'Ç',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&ndash;': '–',
    '&mdash;': '—',
    '&hellip;': '…',
  }
  return text.replace(/&[a-zA-Z0-9#]+;/g, (m) => entities[m] || m)
}

async function fetchPlainText(url: string): Promise<string> {
  const res = await fetch(url)
  const html = await res.text()

  // Extract text from HTML
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  text = decodeHtmlEntities(text)
  return text
}

// ---------------------- Heidelberg ----------------------

function buildHeidelberg(raw: string) {
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  type Section = { name: string; items: { q: string; a: string }[] }
  const sections: Section[] = []
  let currentSection: Section | null = null
  let currentQ = ''
  let currentA = ''
  let collecting = ''

  function flushItem() {
    if (currentQ && currentA && currentSection) {
      const q = currentQ.replace(/^Pergunta\s*\d*[.:]?\s*/i, '').trim()
      const a = currentA.replace(/^Resposta\s*[.:]?\s*/i, '').trim()
      if (q && a && a.length > 5) {
        currentSection.items.push({ q, a })
      }
    }
    currentQ = ''
    currentA = ''
    collecting = ''
  }

  for (const line of lines) {
    // Detect section headers
    const domingo = line.match(/^DOMINGO\s+(\d+)/i)
    if (domingo) {
      flushItem()
      currentSection = { name: `Domingo ${domingo[1]}`, items: [] }
      sections.push(currentSection)
      continue
    }

    // Skip PART headers and extra text
    if (line.match(/^PARTE\s+\d/i) || line.match(/^PARTE\s*\d*:.*/i)) {
      continue
    }

    // Question: "N. text" where N is a number
    const qMatch = line.match(/^(\d+)[,.]\s+(.*)/)
    if (qMatch) {
      flushItem()
      currentQ = qMatch[2]
      collecting = 'q'

      // Check if answer is inline: "text R. text" or "text R:text"
      const rIdx = currentQ.search(/\b[Rr]\.\s+/)
      if (rIdx >= 0) {
        currentA = currentQ.slice(rIdx + 2).trim()
        currentQ = currentQ.slice(0, rIdx).trim()
        collecting = 'done'
      }
      continue
    }

    // Answer line starting with "R."
    const aMatch = line.match(/^[Rr]\.\s+(.*)/)
    if (aMatch) {
      currentA = aMatch[1]
      collecting = 'a'
      continue
    }

    // Append to current item
    if (collecting === 'q') {
      currentQ += ` ${line}`
      // Check if this appended text contains R.
      const rIdx = currentQ.search(/\b[Rr]\.\s+/)
      if (rIdx >= 0) {
        currentA = currentQ.slice(rIdx + 2).trim()
        currentQ = currentQ.slice(0, rIdx).trim()
        collecting = 'done'
      }
    } else if (collecting === 'a') {
      currentA += ` ${line}`
    }
  }

  flushItem()

  // Remove sections with no items (e.g., PART headers that created empty sections)
  const validSections = sections.filter((s) => s.items.length > 0)

  return {
    type: 'catechism',
    id: 'heidelberg',
    name: 'Catecismo de Heidelberg',
    sectionLabel: 'Domingo',
    itemLabel: 'Pergunta',
    sections: validSections,
  }
}

// ---------------------- Westminster ----------------------

function buildWestminster(raw: string) {
  // Extract the numbered catechism from the page
  // Format: "1. Question text\nAnswer paragraph\n2. Question text\n..."
  const items: { q: string; a: string }[] = []
  const _regex = /(\d+)\.\s+([^]*?)(?=\n\d+\.\s|\n*$)/g

  // First, find where the catechism content starts (after "1. Qual é...")
  const startIdx = raw.indexOf('1. Qual')
  if (startIdx < 0) return { type: 'catechism', id: 'westminster', name: '', sectionLabel: '', itemLabel: '', sections: [] }

  const content = raw.slice(startIdx)

  // Split by numbered questions
  const parts = content.split(/\n(?=\d+\.\s)/)

  for (const part of parts) {
    const m = part.match(/^(\d+)\.\s+(.*)/)
    if (!m) continue

    const num = parseInt(m[1], 10)
    if (num < 1 || num > 107) continue

    const rest = m[2] + part.slice(m[0].length)

    // The question ends with a question mark, then the answer follows
    const qmIdx = rest.indexOf('?')
    if (qmIdx < 0) {
      // No question mark - everything is the question
      items.push({ q: rest.trim(), a: '' })
      continue
    }

    const question = rest.slice(0, qmIdx + 1).trim()
    const answer = rest.slice(qmIdx + 1).trim()

    items.push({ q: question, a: answer })
  }

  return {
    type: 'catechism',
    id: 'westminster',
    name: 'Breve Catecismo de Westminster',
    sectionLabel: 'Parte',
    itemLabel: 'Pergunta',
    sections: [
      {
        name: 'Catecismo',
        items,
      },
    ],
  }
}

async function main() {
  console.log('Fetching Heidelberg...')
  const heidRaw = await fetchPlainText(HEIDELBERG_URL)
  const heid = buildHeidelberg(heidRaw)
  const hCount = heid.sections.reduce((s, sec) => s + sec.items.length, 0)
  console.log(`  ${hCount} items in ${heid.sections.length} sections`)
  await Bun.write(`${OUTPUT_DIR}/heidelberg.json`, JSON.stringify(heid, null, 2))

  console.log('Fetching Westminster...')
  const westRaw = await fetchPlainText(WESTMINSTER_URL)
  const west = buildWestminster(westRaw)
  const wCount = west.sections.reduce((s, sec) => s + sec.items.length, 0)
  console.log(`  ${wCount} items in ${west.sections.length} sections`)
  await Bun.write(`${OUTPUT_DIR}/westminster.json`, JSON.stringify(west, null, 2))
}

main().catch(console.error)
