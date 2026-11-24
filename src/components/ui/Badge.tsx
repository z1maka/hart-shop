import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type BadgeTone = 'ink' | 'accent' | 'alert'

type BadgeProps = {
  readonly tone?: BadgeTone
  readonly className?: string
  readonly children: ReactNode
}

// Small labels in Manrope, in the case they are typed: capitals belong to the
// big headings, buttons and the menu (owner, 24.11.2026).
const TONE_CLASSES: Record<BadgeTone, string> = {
  ink: 'bg-ink text-caption font-semibold text-khaki',
  accent: 'bg-accent-soft text-caption font-semibold text-accent',
  alert: 'bg-alert text-caption font-semibold text-white',
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
