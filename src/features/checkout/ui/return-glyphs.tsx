import type { ReactNode } from 'react'

export type GlyphProps = { readonly className?: string }

// One stroke style for every icon on the payment return page, so the big
// state badge and the small step icons read as one set.
export function GlyphFrame({
  className,
  children,
}: {
  readonly className?: string
  readonly children: ReactNode
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  )
}

export function MessageGlyph({ className }: GlyphProps) {
  return (
    <GlyphFrame className={className}>
      <path d="M4.5 5.5h15a1.5 1.5 0 0 1 1.5 1.5v8.5a1.5 1.5 0 0 1-1.5 1.5H10l-4.5 3.5V17h-1A1.5 1.5 0 0 1 3 15.5V7a1.5 1.5 0 0 1 1.5-1.5z" />
      <path d="M7.5 10h9M7.5 13h5.5" />
    </GlyphFrame>
  )
}

export function BoxGlyph({ className }: GlyphProps) {
  return (
    <GlyphFrame className={className}>
      <path d="M12 3l8 4.2v9.6L12 21l-8-4.2V7.2L12 3z" />
      <path d="M4 7.2l8 4.3 8-4.3M12 11.5V21" />
    </GlyphFrame>
  )
}

export function TruckGlyph({ className }: GlyphProps) {
  return (
    <GlyphFrame className={className}>
      <path d="M2.5 6.5h11v9.5h-11zM13.5 9.5h4l3 3.5v3h-7" />
      <circle cx="7" cy="17.5" r="1.8" />
      <circle cx="17" cy="17.5" r="1.8" />
    </GlyphFrame>
  )
}

export function ShieldGlyph({ className }: GlyphProps) {
  return (
    <GlyphFrame className={className}>
      <path d="M12 3l7.5 3v5.5c0 4.4-3.1 8.2-7.5 9.5-4.4-1.3-7.5-5.1-7.5-9.5V6L12 3z" />
      <path d="M9 12l2.2 2.2L15.5 10" />
    </GlyphFrame>
  )
}

export function PhoneGlyph({ className }: GlyphProps) {
  return (
    <GlyphFrame className={className}>
      <path d="M6.6 3.5h2.6l1.3 4.1-1.9 1.3a11 11 0 0 0 6.5 6.5l1.3-1.9 4.1 1.3v2.6a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2z" />
    </GlyphFrame>
  )
}
