'use client'

import { Button } from '@/components/ui/Button'

// The browser's own print dialog saves a PDF too: no PDF library needed for
// an invoice the admin sends by hand.
export function PrintButton() {
  return (
    <Button variant="khaki" size="sm" onClick={() => window.print()}>
      Печать / PDF
    </Button>
  )
}
