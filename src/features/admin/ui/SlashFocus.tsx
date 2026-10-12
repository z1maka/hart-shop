'use client'

import { useEffect } from 'react'

// "/" jumps to the search field from anywhere on the page, unless the admin
// is already typing somewhere.
export function SlashFocus({ targetId }: { readonly targetId: string }) {
  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return

      const active = document.activeElement
      const isTyping =
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLSelectElement ||
        (active instanceof HTMLElement && active.isContentEditable)
      if (isTyping) return

      const target = document.getElementById(targetId)
      if (!(target instanceof HTMLInputElement)) return
      event.preventDefault()
      target.focus()
      target.select()
    }

    window.addEventListener('keydown', focusSearch)
    return () => window.removeEventListener('keydown', focusSearch)
  }, [targetId])

  return null
}
