import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type BadgeTone = 'ink' | 'accent' | 'alert'

type BadgeProps = {
  readonly tone?: BadgeTone
  readonly className?: string
  readonly children: ReactNode
}

// The dark product badge is the brand's Oswald label; the light notes beside
// a price read as text, in Manrope.
const TONE_CLASSES: Record<BadgeTone, string> = {
  ink: 'bg-ink font-display text-[11px] font-semibold tracking-[0.1em] text-khaki',
  accent: 'bg-accent-soft text-[12px] font-bold text-accent',
  alert: 'bg-alert text-[12px] font-bold text-white',
}

export function Badge({ tone = 'ink', className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-chip px-2 py-1',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
