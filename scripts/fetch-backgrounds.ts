import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

interface PhotoEntry {
  id: string
  name: string
}

const PROJECT_ROOT = join(import.meta.dir, '..')
const OUT_DIR = join(PROJECT_ROOT, 'app', 'public', 'bg')

const CDN = 'https://images.unsplash.com'
const FULL_PARAMS = 'w=1080&h=1080&fit=crop&q=55&fm=webp&auto=format'
const THUMB_PARAMS = 'w=200&h=200&fit=crop&q=50&fm=webp&auto=format'

async function main() {
  const photos: PhotoEntry[] = await Bun.file(join(PROJECT_ROOT, 'scripts', 'background-photos.json')).json()

  await mkdir(OUT_DIR, { recursive: true })

  let totalFull = 0
  let totalThumb = 0

  for (const photo of photos) {
    const slug = photo.id.replace(/^photo-/, '')
    const fullPath = join(OUT_DIR, `${slug}.webp`)
    const thumbPath = join(OUT_DIR, `${slug}-thumb.webp`)

    const fullRes = await fetch(`${CDN}/${photo.id}?${FULL_PARAMS}`)
    if (!fullRes.ok) {
      console.error(`  ✗ ${photo.id} full ${fullRes.status}`)
      continue
    }
    const fullBuf = Buffer.from(await fullRes.arrayBuffer())
    await Bun.write(fullPath, fullBuf)
    totalFull += fullBuf.length

    const thumbRes = await fetch(`${CDN}/${photo.id}?${THUMB_PARAMS}`)
    if (!thumbRes.ok) {
      console.error(`  ✗ ${photo.id} thumb ${thumbRes.status}`)
      continue
    }
    const thumbBuf = Buffer.from(await thumbRes.arrayBuffer())
    await Bun.write(thumbPath, thumbBuf)
    totalThumb += thumbBuf.length

    console.log(`  ✓ ${photo.name} (${(fullBuf.length / 1024).toFixed(1)}KB + ${(thumbBuf.length / 1024).toFixed(1)}KB)`)
  }

  console.log(`\nTotal: ${photos.length} photos, ${((totalFull + totalThumb) / 1024 / 1024).toFixed(2)}MB`)
  console.log(`Output: ${OUT_DIR}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
