'use client'

import { useEffect } from 'react'
import { withoutPlacedMarker } from '@/features/checkout/model/placed-order'

// Drops the from-checkout marker from the address bar, so the buyer never
// shares or bookmarks an address that reports the sale.
export function ForgetJustPlaced(): null {
  useEffect(() => {
    window.history.replaceState(null, '', withoutPlacedMarker(window.location.href))
  }, [])

  return null
}
