// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@capacitor/haptics', () => ({
  Haptics: { impact: vi.fn().mockResolvedValue(undefined) },
  ImpactStyle: { Medium: 'MEDIUM' },
}))

import { useSwipeToDelete } from './use-swipe'

function pe(clientX: number, clientY = 0): React.PointerEvent {
  return {
    clientX,
    clientY,
    pointerId: 1,
    currentTarget: { setPointerCapture: vi.fn() },
  } as unknown as React.PointerEvent
}

describe('useSwipeToDelete', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('starts at translateX 0', () => {
    const { result } = renderHook(() => useSwipeToDelete(vi.fn()))
    expect(result.current.translateX).toBe(0)
  })

  it('moves translateX left as pointer moves left', () => {
    const { result } = renderHook(() => useSwipeToDelete(vi.fn()))

    act(() => { result.current.handlePointerDown(pe(100)) })
    act(() => { result.current.handlePointerMove(pe(60)) })

    expect(result.current.translateX).toBe(-40)
  })

  it('clamps translateX at -80 (MAX_TRANSLATE)', () => {
    const { result } = renderHook(() => useSwipeToDelete(vi.fn()))

    act(() => { result.current.handlePointerDown(pe(200)) })
    act(() => { result.current.handlePointerMove(pe(0)) })

    expect(result.current.translateX).toBe(-80)
  })

  it('ignores rightward movement (translateX stays 0)', () => {
    const { result } = renderHook(() => useSwipeToDelete(vi.fn()))

    act(() => { result.current.handlePointerDown(pe(100)) })
    act(() => { result.current.handlePointerMove(pe(150)) })

    expect(result.current.translateX).toBe(0)
  })

  it('calls onDelete after swipe past threshold (80px)', async () => {
    const onDelete = vi.fn()
    const { result } = renderHook(() => useSwipeToDelete(onDelete))

    act(() => { result.current.handlePointerDown(pe(200)) })
    act(() => { result.current.handlePointerMove(pe(100)) })
    await act(async () => {
      result.current.handlePointerUp(pe(100))
      vi.advanceTimersByTime(200)
    })

    expect(onDelete).toHaveBeenCalled()
  })

  it('does not call onDelete when swipe is below threshold', async () => {
    const onDelete = vi.fn()
    const { result } = renderHook(() => useSwipeToDelete(onDelete))

    act(() => { result.current.handlePointerDown(pe(200)) })
    act(() => { result.current.handlePointerMove(pe(160)) })
    await act(async () => {
      result.current.handlePointerUp(pe(160))
    })

    expect(onDelete).not.toHaveBeenCalled()
    expect(result.current.translateX).toBe(0)
  })

  it('resets translateX to 0 on pointer cancel', () => {
    const { result } = renderHook(() => useSwipeToDelete(vi.fn()))

    act(() => { result.current.handlePointerDown(pe(100)) })
    act(() => { result.current.handlePointerMove(pe(50)) })
    act(() => { result.current.handlePointerCancel() })

    expect(result.current.translateX).toBe(0)
  })

  it('ignores horizontal tracking after vertical scroll is detected', () => {
    const { result } = renderHook(() => useSwipeToDelete(vi.fn()))

    act(() => { result.current.handlePointerDown(pe(100, 100)) })
    // Move more vertically than horizontally — detected as vertical scroll
    act(() => { result.current.handlePointerMove({ ...pe(102, 120) }) })
    // Further horizontal movement should be ignored
    act(() => { result.current.handlePointerMove(pe(50, 120)) })

    expect(result.current.translateX).toBe(0)
  })

  it('reset() returns translateX to 0', () => {
    const { result } = renderHook(() => useSwipeToDelete(vi.fn()))

    act(() => { result.current.handlePointerDown(pe(100)) })
    act(() => { result.current.handlePointerMove(pe(60)) })
    act(() => { result.current.reset() })

    expect(result.current.translateX).toBe(0)
  })
})
