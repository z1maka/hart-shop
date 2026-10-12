'use client'

import { useRef } from 'react'

// Search answers can arrive out of order — a slow one for "Киї" after a
// fast one for "Київ", branches after the admin switched to lockers. Each
// request asks for a ticket; only the newest ticket may put its answer on
// the screen.
export function useLatestRequest(): () => () => boolean {
  const latest = useRef(0)

  return () => {
    latest.current += 1
    const ticket = latest.current
    return () => ticket === latest.current
  }
}
