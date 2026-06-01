// Bun script: scrape Heidelberg and Westminster catechisms from web
// Usage: bun run scripts/scrape-catechisms.ts

const HEIDELBERG_URL = 'https://www.monergismo.com/textos/catecismos/catecismo_heidelberg.htm'
const WESTMINSTER_URL = 'https://pt.ligonier.org/recursos/credos-e-confissoes/o-breve-catecismo-de-westminster/'

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url)
  const html = await res.text()

  // Strip HTML tags, normalize whitespace
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n\s*\n/g, '\n')
    .trim()
}

function parseHeidelberg(text: string) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)

  const sections: { name: string; items: { q: string; a: string }[] }[] = []
  let currentSection: { name: string; items: { q: string; a: string }[] } | null = null
  let currentQ = ''
  let currentA = ''
  let collecting = 'none' // 'none' | 'q' | 'a'

  for (const line of lines) {
    const domingoMatch = line.match(/^DOMINGO\s+(\d+)/i)
    const parteMatch = line.match(/^PARTE\s+\d*:?\s*(.*)/i)

    if (domingoMatch) {
      if (currentSection && (currentQ || currentA)) {
        if (currentQ && currentA) {
          currentSection.items.push({ q: currentQ, a: currentA })
        }
        currentQ = ''
        currentA = ''
        collecting = 'none'
      }
      currentSection = { name: `Domingo ${domingoMatch[1]}`, items: [] }
      sections.push(currentSection)
      continue
    }

    if (parteMatch && !domingoMatch) {
      // Part headers are sub-headings within sections
      continue
    }

    const qMatch = line.match(/^(\d+)\.\s+(.*)/)
    if (qMatch) {
      if (currentSection && currentQ && currentA) {
        currentSection.items.push({ q: currentQ, a: currentA })
      }
      currentQ = qMatch[2].trim()
      currentA = ''
      collecting = 'q'

      // Check if line contains "R." answer
      const rIdx = currentQ.indexOf('R.')
      if (rIdx >= 0) {
        currentA = currentQ.slice(rIdx + 2).trim()
        currentQ = currentQ.slice(0, rIdx).trim()
        collecting = 'none'
      }
      continue
    }

    const aMatch = line.match(/^R\.\s+(.*)/)
    if (aMatch) {
      currentA = aMatch[1].trim()
      collecting = 'none'
      continue
    }

    if (collecting === 'q' && line.length > 10) {
      currentQ += ' ' + line
      // Check if this continuation contains "R."
      const rIdx = currentQ.indexOf('R.')
      if (rIdx >= 0) {
        currentA = currentQ.slice(rIdx + 2).trim()
        currentQ = currentQ.slice(0, rIdx).trim()
        collecting = 'none'
      }
    } else if (collecting === 'none' && line.length > 10 && !line.match(/^\(\d+/)) {
      // Could be continuation of answer if it starts with lowercase or common words
      if (currentA && line[0] === line[0].toLowerCase() && !line.startsWith('http')) {
        currentA += ' ' + line
      }
    }
  }

  // Push last Q&A
  if (currentSection && currentQ && currentA) {
    currentSection.items.push({ q: currentQ, a: currentA })
  }

  return {
    type: 'catechism',
    id: 'heidelberg',
    name: 'Catecismo de Heidelberg',
    sectionLabel: 'Domingo',
    itemLabel: 'Pergunta',
    sections: sections.map((s) => ({
      name: s.name,
      items: s.items.map((item) => ({
        q: item.q.replace(/^[Pp]ergunta\s*\d*[\.:]?\s*/i, '').trim(),
        a: item.a.replace(/^[Rr]esposta\s*[\.:]?\s*/i, '').trim(),
      })),
    })),
  }
}

function parseWestminster(text: string) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)

  const items: { q: string; a: string }[] = []
  let currentQ = ''
  let currentA = ''
  let collecting = 'none'
  let currentNum = 0

  for (const line of lines) {
    const qMatch = line.match(/^(\d+)\.\s+(.*)/)
    if (qMatch) {
      const num = parseInt(qMatch[1], 10)
      if (num === currentNum + 1 || num === 1) {
        if (currentQ && currentA) {
          items.push({ q: currentQ, a: currentA })
        }
        currentNum = num
        currentQ = qMatch[2].trim()
        currentA = ''
        collecting = 'q'
        continue
      }
    }

    // Answer starts with capital letter after a question
    if (collecting === 'q' && line.length > 5 && !line.match(/^\d+\./) && !line.startsWith('(')) {
      if (!currentQ.endsWith('?') && !currentQ.endsWith('?')) {
        currentQ += ' ' + line
      } else {
        currentA = line
        collecting = 'none'
      }
    } else if (collecting === 'none' && currentA && line.length > 5 && !line.match(/^\d+\./) && !line.startsWith('(')) {
      currentA += ' ' + line
    }
  }

  if (currentQ && currentA) {
    items.push({ q: currentQ, a: currentA })
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
        items: items.map((item) => ({
          q: item.q.trim(),
          a: item.a.trim(),
        })),
      },
    ],
  }
}

async function main() {
  const outputDir = `${import.meta.dirname}/../app/public/textos`

  // Fetch and parse Heidelberg
  console.log('Fetching Heidelberg Catechism...')
  const heidText = await fetchText(HEIDELBERG_URL)
  const heid = parseHeidelberg(heidText)
  const heidPath = `${outputDir}/catecismo-heidelberg.json`
  await Bun.write(heidPath, JSON.stringify(heid, null, 2))
  console.log(`Saved Heidelberg (${heid.sections.length} sections, ${heid.sections.reduce((s, sec) => s + sec.items.length, 0)} items)`)

  // Fetch and parse Westminster
  console.log('Fetching Westminster Shorter Catechism...')
  const westText = await fetchText(WESTMINSTER_URL)
  const west = parseWestminster(westText)
  const westPath = `${outputDir}/catecismo-westminster.json`
  await Bun.write(westPath, JSON.stringify(west, null, 2))
  console.log(`Saved Westminster (${west.sections.length} sections, ${west.sections.reduce((s, sec) => s + sec.items.length, 0)} items)`)
}

main().catch(console.error)
