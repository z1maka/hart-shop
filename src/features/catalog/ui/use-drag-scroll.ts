'use client'

import { useRef, type MouseEvent, type PointerEvent, type RefObject } from 'react'
import { isDrag } from '@/features/catalog/model/gallery-gesture'

type DragScrollHandlers = {
  readonly onPointerDown: (event: PointerEvent) => void
  readonly onPointerMove: (event: PointerEvent) => void
  readonly onPointerUp: () => void
  readonly onPointerCancel: () => void
  readonly onClickCapture: (event: MouseEvent) => void
}

type Drag = { readonly startX: number; readonly startLeft: number; readonly hasMoved: boolean }

// A row of thumbnails hides its scrollbar, and a mouse has no finger to swipe
// it with: pressing and dragging scrolls it instead. Touch keeps the
// browser's own scrolling. The row gets `data-dragging` while it moves, to
// switch snapping off, and the click that ends a drag picks nothing.
export function useDragScroll(scrollerRef: RefObject<HTMLElement | null>): DragScrollHandlers {
  const dragRef = useRef<Drag | null>(null)
  const didDragRef = useRef(false)

  function endDrag() {
    didDragRef.current = dragRef.current?.hasMoved ?? false
    dragRef.current = null
    scrollerRef.current?.removeAttribute('data-dragging')
    // The click a drag ends with arrives in this same task; a browser that
    // sends none must not swallow the next real click, a keyboard one included.
    setTimeout(() => {
      didDragRef.current = false
    })
  }

  return {
    onPointerDown: (event) => {
      const scroller = scrollerRef.current
      if (!scroller || event.pointerType !== 'mouse' || event.button !== 0) return

      didDragRef.current = false
      dragRef.current = { startX: event.clientX, startLeft: scroller.scrollLeft, hasMoved: false }
    },
    onPointerMove: (event) => {
      const drag = dragRef.current
      const scroller = scrollerRef.current
      if (!drag || !scroller) return
      // Released outside the row before the drag took hold, so the row never
      // heard it: with the button up, hovering must not scroll.
      if (event.buttons === 0) {
        endDrag()
        return
      }

      const deltaX = event.clientX - drag.startX
      if (!drag.hasMoved) {
        if (!isDrag(deltaX)) return
        dragRef.current = { ...drag, hasMoved: true }
        scroller.setPointerCapture(event.pointerId)
        scroller.setAttribute('data-dragging', 'true')
      }
      scroller.scrollLeft = drag.startLeft - deltaX
    },
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    onClickCapture: (event) => {
      if (!didDragRef.current) return

      didDragRef.current = false
      event.preventDefault()
      event.stopPropagation()
    },
  }
}
