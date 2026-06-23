import { useEffect } from 'react'

interface PageMetaProps {
  title: string
  description: string
  path?: string
}

export function PageMeta({ title, description, path = '/' }: PageMetaProps) {
  useEffect(() => {
    document.title = title

    const descMeta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (descMeta) descMeta.content = description

    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (canonical) canonical.href = `https://vvitae.com${path}`

    const ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]')
    if (ogTitle) ogTitle.content = title

    const ogDesc = document.querySelector<HTMLMetaElement>('meta[property="og:description"]')
    if (ogDesc) ogDesc.content = description

    const ogUrl = document.querySelector<HTMLMetaElement>('meta[property="og:url"]')
    if (ogUrl) ogUrl.content = `https://vvitae.com${path}`
  }, [title, description, path])

  return null
}
