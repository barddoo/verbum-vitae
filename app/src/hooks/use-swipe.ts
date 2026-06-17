import { useCallback, useRef, useState } from 'react'

const SWIPE_THRESHOLD = 80
const MAX_TRANSLATE = 80

export function useSwipeToDelete(onDelete: () => void) {
  const [translateX, setTranslateX] = useState(0)
  const startX = useRef(0)
  const startY = useRef(0)
  const tracking = useRef(false)
  const vertical = useRef(false)
  const deleting = useRef(false)

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    startX.current = e.clientX
    startY.current = e.clientY
    tracking.current = true
    vertical.current = false
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!tracking.current) return

    const dx = Math.abs(e.clientX - startX.current)
    const dy = Math.abs(e.clientY - startY.current)

    if (!vertical.current && dy > dx && dy > 10) {
      vertical.current = true
      tracking.current = false
      setTranslateX(0)
      return
    }

    if (vertical.current) return

    const offset = e.clientX - startX.current
    if (offset > 0) {
      setTranslateX(0)
    } else {
      setTranslateX(Math.max(offset, -MAX_TRANSLATE))
    }
  }, [])

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!tracking.current) return
      tracking.current = false

      const offset = e.clientX - startX.current
      if (offset < -SWIPE_THRESHOLD && !deleting.current) {
        deleting.current = true
        setTranslateX(-MAX_TRANSLATE)
        setTimeout(() => {
          onDelete()
          setTranslateX(0)
          deleting.current = false
        }, 150)
      } else {
        setTranslateX(0)
      }
    },
    [onDelete],
  )

  const handlePointerCancel = useCallback(() => {
    tracking.current = false
    setTranslateX(0)
  }, [])

  const reset = useCallback(() => {
    setTranslateX(0)
  }, [])

  return { translateX, handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel, reset }
}
