// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@capacitor/haptics', () => ({
  Haptics: { impact: vi.fn().mockResolvedValue(undefined) },
  ImpactStyle: { Light: 'LIGHT' },
}))

import { useLongPress } from './use-long-press'

function makePointerEvent(type: string, x = 0, y = 0): React.PointerEvent<HTMLElement> {
  return { clientX: x, clientY: y, pointerId: 1, currentTarget: { setPointerCapture: vi.fn() } } as unknown as React.PointerEvent<HTMLElement>
}

describe('useLongPress', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('calls onTap immediately on pointer up when enabled (no long press)', () => {
    const onLongPress = vi.fn()
    const onTap = vi.fn()
    const { result } = renderHook(() => useLongPress({ onLongPress, onTap, enabled: true }))

    act(() => {
      result.current.handlePointerDown(1, makePointerEvent('pointerdown'))
      result.current.handlePointerUp(1)
    })

    expect(onTap).toHaveBeenCalledWith(1)
    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('does not call onTap when not enabled', () => {
    const onTap = vi.fn()
    const { result } = renderHook(() => useLongPress({ onLongPress: vi.fn(), onTap, enabled: false }))

    act(() => {
      result.current.handlePointerDown(1, makePointerEvent('pointerdown'))
      result.current.handlePointerUp(1)
    })

    expect(onTap).not.toHaveBeenCalled()
  })

  it('fires onLongPress after 500ms when not enabled', () => {
    const onLongPress = vi.fn()
    const { result } = renderHook(() => useLongPress({ onLongPress, onTap: vi.fn(), enabled: false }))

    act(() => {
      result.current.handlePointerDown(2, makePointerEvent('pointerdown'))
    })
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(onLongPress).toHaveBeenCalledWith(2)
  })

  it('does not fire onLongPress if pointer up before 500ms', () => {
    const onLongPress = vi.fn()
    const { result } = renderHook(() => useLongPress({ onLongPress, onTap: vi.fn(), enabled: false }))

    act(() => {
      result.current.handlePointerDown(1, makePointerEvent('pointerdown'))
    })
    act(() => {
      vi.advanceTimersByTime(300)
      result.current.handlePointerUp(1)
    })

    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('cancels long press timer on pointer move beyond 8px threshold', () => {
    const onLongPress = vi.fn()
    const { result } = renderHook(() => useLongPress({ onLongPress, onTap: vi.fn(), enabled: false }))

    act(() => {
      result.current.handlePointerDown(1, makePointerEvent('pointerdown', 0, 0))
    })
    act(() => {
      result.current.handlePointerMove(makePointerEvent('pointermove', 10, 0))
      vi.advanceTimersByTime(500)
    })

    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('does not cancel timer for small move within threshold', () => {
    const onLongPress = vi.fn()
    const { result } = renderHook(() => useLongPress({ onLongPress, onTap: vi.fn(), enabled: false }))

    act(() => {
      result.current.handlePointerDown(1, makePointerEvent('pointerdown', 0, 0))
    })
    act(() => {
      result.current.handlePointerMove(makePointerEvent('pointermove', 5, 5))
      vi.advanceTimersByTime(500)
    })

    expect(onLongPress).toHaveBeenCalledWith(1)
  })

  it('cancels timer on pointer cancel', () => {
    const onLongPress = vi.fn()
    const { result } = renderHook(() => useLongPress({ onLongPress, onTap: vi.fn(), enabled: false }))

    act(() => {
      result.current.handlePointerDown(1, makePointerEvent('pointerdown'))
    })
    act(() => {
      result.current.handlePointerCancel()
      vi.advanceTimersByTime(500)
    })

    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('does not call onTap after long press fires', () => {
    const onTap = vi.fn()
    const onLongPress = vi.fn()
    const { result } = renderHook(() => useLongPress({ onLongPress, onTap, enabled: false }))

    act(() => {
      result.current.handlePointerDown(1, makePointerEvent('pointerdown'))
    })
    act(() => {
      vi.advanceTimersByTime(500)
    })
    act(() => {
      result.current.handlePointerUp(1)
    })

    expect(onLongPress).toHaveBeenCalledWith(1)
    expect(onTap).not.toHaveBeenCalled()
  })
})
