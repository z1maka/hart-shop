'use client'

import { Button } from '@/components/ui/Button'

// The browser's own print dialog saves a PDF too: no PDF library needed for
// an invoice, whether the admin prints it or the buyer saves it.
export function PrintButton({ label }: { readonly label: string }) {
  return (
    <Button variant="khaki" size="sm" onClick={() => window.print()}>
      {label}
    </Button>
  )
}
