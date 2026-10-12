import { Slot } from '@radix-ui/react-slot'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  readonly isActive?: boolean
  readonly asChild?: boolean
  readonly children: ReactNode
}

export function Chip({
  isActive = false,
  asChild = false,
  className,
  children,
  ...props
}: ChipProps) {
  const Component = asChild ? Slot : 'button'

  return (
    <Component
      className={cn(
        'inline-flex min-h-10 items-center gap-2 rounded-pill border px-4 text-[13px] font-semibold transition-colors',
        isActive
          ? 'border-accent bg-accent text-white'
          : 'border-subtle bg-raised text-ink hover:border-faint',
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  )
}
