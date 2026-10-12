import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type BadgeTone = 'ink' | 'accent' | 'alert'

type BadgeProps = {
  readonly tone?: BadgeTone
  readonly className?: string
  readonly children: ReactNode
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  ink: 'bg-ink text-khaki',
  accent: 'bg-accent-soft text-accent',
  alert: 'bg-alert text-white',
}

export function Badge({ tone = 'ink', className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-chip px-2 py-1 font-display text-[11px] font-semibold tracking-[0.1em]',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
