import { useCallback, useState } from 'react'
import { useLongPress } from './use-long-press'

export function useVerseSelection() {
  const [selectedVerses, setSelectedVerses] = useState<Set<number>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectionAnchor, setSelectionAnchor] = useState<number | null>(null)

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false)
    setSelectionAnchor(null)
    setSelectedVerses(new Set())
  }, [])

  const handleLongPress = useCallback((v: number) => {
    setSelectionMode(true)
    setSelectionAnchor(v)
    setSelectedVerses(new Set([v]))
  }, [])

  const handleTap = useCallback(
    (v: number) => {
      setSelectedVerses((prev) => {
        const next = new Set(prev)
        if (next.has(v)) {
          next.delete(v)
          if (v === selectionAnchor) setSelectionAnchor(null)
        } else if (selectionAnchor !== null) {
          const lo = Math.min(selectionAnchor, v)
          const hi = Math.max(selectionAnchor, v)
          for (let i = lo; i <= hi; i++) next.add(i)
          setSelectionAnchor(v)
        } else {
          next.add(v)
          setSelectionAnchor(v)
        }
        return next
      })
    },
    [selectionAnchor],
  )

  const longPress = useLongPress({
    onLongPress: handleLongPress,
    onTap: handleTap,
    enabled: !selectionMode,
  })

  return {
    selectedVerses,
    selectionMode,
    selectionAnchor,
    handleLongPress,
    handleTap,
    exitSelectionMode,
    longPress,
  }
}
