import type { ReactNode } from 'react'
import { ReturnScreen } from '@/features/checkout/model/payment-return'
import { GlyphFrame, type GlyphProps } from '@/features/checkout/ui/return-glyphs'
import { cn } from '@/lib/utils'

type Glyph = (props: GlyphProps) => ReactNode

type StateLook = {
  readonly badge: string
  readonly glyph: Glyph
  // A ring spreading out once or twice behind the badge: the moment the
  // money is confirmed deserves a little ceremony, nothing else does.
  readonly ring?: string
  readonly isSpinning?: boolean
  readonly isNudging?: boolean
}

const LOOKS: Record<ReturnScreen, StateLook> = {
  [ReturnScreen.Paid]: {
    badge: 'bg-accent text-white shadow-[0_18px_40px_rgb(90_97_71_/_0.35)]',
    glyph: CheckGlyph,
    ring: 'bg-accent-mid',
  },
  [ReturnScreen.Processing]: {
    badge: 'bg-accent-tint text-accent-hover ring-1 ring-accent-soft',
    glyph: CardGlyph,
    isSpinning: true,
  },
  [ReturnScreen.Slow]: {
    badge: 'bg-accent-tint text-accent-hover ring-1 ring-accent-soft',
    glyph: HourglassGlyph,
  },
  [ReturnScreen.Unpaid]: {
    badge: 'bg-alert-soft text-alert ring-1 ring-alert-edge/60',
    glyph: CrossGlyph,
    isNudging: true,
  },
  [ReturnScreen.Expired]: {
    badge: 'bg-sunken text-muted ring-1 ring-subtle',
    glyph: ClockGlyph,
  },
  [ReturnScreen.Unknown]: {
    badge: 'bg-sunken text-muted ring-1 ring-subtle',
    glyph: QuestionGlyph,
  },
}

export function PaymentStateIcon({ screen }: { readonly screen: ReturnScreen }) {
  const look = LOOKS[screen]
  const Glyph = look.glyph

  return (
    <div className="relative grid size-28 place-items-center" aria-hidden>
      {look.ring ? (
        <span className={cn('absolute inset-2 animate-ring-out rounded-full', look.ring)} />
      ) : null}
      {look.isSpinning ? <SpinnerArc /> : null}
      <span
        className={cn(
          'relative grid size-24 animate-pop-in place-items-center rounded-full',
          look.badge,
          look.isNudging && 'animate-nudge',
        )}
      >
        <Glyph className="size-11" />
      </span>
    </div>
  )
}

// A third of a circle chasing itself around the badge: the page is working,
// not stuck.
function SpinnerArc() {
  return (
    <svg
      viewBox="0 0 112 112"
      className="absolute inset-0 size-28 animate-spin [animation-duration:1.4s]"
    >
      <circle cx="56" cy="56" r="53" fill="none" strokeWidth="3" className="stroke-accent-soft" />
      <circle
        cx="56"
        cy="56"
        r="53"
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray="28 72"
        className="stroke-accent"
      />
    </svg>
  )
}

function CheckGlyph({ className }: GlyphProps) {
  return (
    <GlyphFrame className={className}>
      <path
        d="M5 12.5l4.5 4.5L19 7.5"
        strokeWidth={2.4}
        pathLength={1}
        strokeDasharray={1}
        className="animate-draw-in"
      />
    </GlyphFrame>
  )
}

function CardGlyph({ className }: GlyphProps) {
  return (
    <GlyphFrame className={className}>
      <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
      <path d="M3 10h18" />
      <path d="M7 15h3" />
    </GlyphFrame>
  )
}

function HourglassGlyph({ className }: GlyphProps) {
  return (
    <GlyphFrame className={className}>
      <path d="M7 3.5h10M7 20.5h10" />
      <path d="M8 3.5c0 4 4 5 4 8.5s-4 4.5-4 8.5M16 3.5c0 4-4 5-4 8.5s4 4.5 4 8.5" />
    </GlyphFrame>
  )
}

function CrossGlyph({ className }: GlyphProps) {
  return (
    <GlyphFrame className={className}>
      <path d="M7 7l10 10M17 7L7 17" strokeWidth={2.4} />
    </GlyphFrame>
  )
}

function ClockGlyph({ className }: GlyphProps) {
  return (
    <GlyphFrame className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </GlyphFrame>
  )
}

function QuestionGlyph({ className }: GlyphProps) {
  return (
    <GlyphFrame className={className}>
      <path d="M9.2 9a2.9 2.9 0 1 1 4.1 2.6c-.8.4-1.3 1.1-1.3 2v.6" />
      <path d="M12 17.5h.01" strokeWidth={2.6} />
    </GlyphFrame>
  )
}
