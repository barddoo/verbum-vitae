import { Image as ImageIcon } from 'lucide-react'
import { useRef } from 'react'
import type { Background } from '../../lib/verse-backgrounds'

interface CarouselProps {
  backgrounds: Background[]
  selectedId: string
  onSelect: (bg: Background, customImage?: HTMLImageElement) => void
}

export function BackgroundCarousel({ backgrounds, selectedId, onSelect }: CarouselProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      onSelect({ kind: 'photo', id: 'custom', thumb: url, full: url, name: 'Minha foto' }, img)
    }
    img.src = url
    e.target.value = ''
  }

  return (
    <div className="background-carousel">
      <span className="control-label">Fundo</span>
      <div className="background-carousel-strip">
        <button
          type="button"
          className={`bg-tile bg-tile-upload ${selectedId === 'custom' ? 'active' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          aria-label="Usar minha foto"
        >
          <span className="bg-tile-upload-icon" aria-hidden="true">
            <ImageIcon size={20} />
          </span>
          <span className="bg-tile-name">Minha foto</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          aria-hidden="true"
          tabIndex={-1}
        />
        {backgrounds.map((bg) => (
          <button
            key={bg.id}
            type="button"
            className={`bg-tile ${selectedId === bg.id ? 'active' : ''}`}
            onClick={() => onSelect(bg)}
            aria-label={bg.name}
            aria-pressed={selectedId === bg.id}
          >
            {bg.kind === 'photo' ? (
              <img src={bg.thumb} alt="" width={56} height={56} loading="lazy" />
            ) : (
              <span
                className="bg-tile-gradient"
                style={{ background: `linear-gradient(135deg, ${bg.stops[0]}, ${bg.stops[1]})` }}
                aria-hidden="true"
              />
            )}
            <span className="bg-tile-name">{bg.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
