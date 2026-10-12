import type { ReactNode } from 'react'

// The body of a page that streams in after the shell (the cart, the checkout).
// It holds at least a screen's height less the bars and the title above it, so
// the footer starts below the fold under the skeleton and under the content
// alike, and nothing on screen moves when the content arrives. Without it the
// footer jumped as the cart loaded: CLS 0.29 on a phone, 0.87 on a tablet.
export function StreamedPageBody({ children }: { readonly children: ReactNode }) {
  return <div className="min-h-[calc(100svh-12rem)]">{children}</div>
}
