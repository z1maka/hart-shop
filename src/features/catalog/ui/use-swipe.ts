'use client'

import { useRef, type PointerEvent } from 'react'
import { swipeStep } from '@/features/catalog/model/gallery-gesture'

type SwipeHandlers = {
  readonly onPointerDown: (event: PointerEvent) => void
  readonly onPointerUp: (event: PointerEvent) => void
  readonly onPointerCancel: () => void
}

type Point = { readonly x: number; readonly y: number }

// Touch only: a mouse has the arrows, and its drag would fight the click that
// opens a photo. The element needs `touch-action: pan-y`, so the browser keeps
// scrolling the page vertically and leaves sideways moves to this hook. A
// second finger means a pinch, never a swipe.
export function useSwipe(onStep: (offset: 1 | -1) => void): SwipeHandlers {
  const startRef = useRef<Point | null>(null)

  return {
    onPointerDown: (event) => {
      const isSingleTouch = event.isPrimary && event.pointerType !== 'mouse'
      startRef.current = isSingleTouch ? { x: event.clientX, y: event.clientY } : null
    },
    onPointerUp: (event) => {
      const start = startRef.current
      startRef.current = null
      if (!start || !event.isPrimary) return

      const step = swipeStep(event.clientX - start.x, event.clientY - start.y)
      if (step !== 0) onStep(step)
    },
    onPointerCancel: () => {
      startRef.current = null
    },
  }
}
