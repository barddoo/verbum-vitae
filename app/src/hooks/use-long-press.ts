import { useRef } from 'react'

interface LongPressConfig {
  onLongPress: (verseNum: number) => void
  onTap: (verseNum: number) => void
  enabled: boolean
}

export function useLongPress({ onLongPress, onTap, enabled }: LongPressConfig) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pointerStart = useRef({ x: 0, y: 0 })
  const didLongPress = useRef(false)

  function handlePointerDown(v: number, e: React.PointerEvent<HTMLElement>) {
    if (enabled) return
    didLongPress.current = false
    pointerStart.current = { x: e.clientX, y: e.clientY }
    e.currentTarget.setPointerCapture(e.pointerId)
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true
      navigator.vibrate?.(30)
      onLongPress(v)
    }, 500)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLElement>) {
    if (!longPressTimer.current) return
    const dx = e.clientX - pointerStart.current.x
    const dy = e.clientY - pointerStart.current.y
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  function handlePointerUp(v: number) {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    if (didLongPress.current) return
    if (enabled) onTap(v)
  }

  function handlePointerCancel() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  return { handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel }
}
