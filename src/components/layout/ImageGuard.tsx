'use client'

import { useEffect } from 'react'

// Photos of our own products are the one thing a competing shop can take in a
// second. Nothing in a browser can truly stop that — a screenshot always
// works — so this only removes the two effortless ways: the right-click menu
// and dragging the picture out of the page. The watermark is what protects a
// photo once it has left.
export function ImageGuard() {
  useEffect(() => {
    function blockOnImage(event: Event) {
      if (event.target instanceof HTMLImageElement) event.preventDefault()
    }

    document.addEventListener('contextmenu', blockOnImage)
    document.addEventListener('dragstart', blockOnImage)

    return () => {
      document.removeEventListener('contextmenu', blockOnImage)
      document.removeEventListener('dragstart', blockOnImage)
    }
  }, [])

  return null
}
