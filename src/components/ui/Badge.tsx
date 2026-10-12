import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type BadgeTone = 'ink' | 'accent' | 'alert'

type BadgeProps = {
  readonly tone?: BadgeTone
  readonly className?: string
  readonly children: ReactNode
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  ink: 'bg-ink text-on-dark',
  accent: 'bg-accent-soft text-accent-hover',
  alert: 'bg-alert text-white',
}

export function Badge({ tone = 'ink', className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-pill px-[11px] py-1.5 text-[11px] font-semibold',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
