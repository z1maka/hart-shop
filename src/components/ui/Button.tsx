import { Slot } from '@radix-ui/react-slot'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'dark' | 'quiet' | 'link'
type ButtonSize = 'sm' | 'md' | 'lg'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  readonly variant?: ButtonVariant
  readonly size?: ButtonSize
  readonly asChild?: boolean
  readonly children: ReactNode
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-hover',
  secondary: 'border border-strong bg-surface text-ink hover:border-faint',
  dark: 'bg-ink text-on-dark hover:bg-ink-hover',
  quiet: 'border border-subtle bg-transparent text-muted hover:border-faint hover:text-ink',
  link: 'text-accent-hover underline-offset-4 hover:underline',
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 text-[13px]',
  md: 'min-h-11 px-4 text-[13.5px]',
  lg: 'min-h-[50px] px-6 text-[14.5px]',
}

export function Button({
  variant = 'primary',
  size = 'md',
  asChild = false,
  className,
  children,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : 'button'

  return (
    <Component
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-control font-semibold transition-colors',
        variant === 'link' ? 'min-h-0 p-0' : SIZE_CLASSES[size],
        VARIANT_CLASSES[variant],
        'disabled:pointer-events-none disabled:opacity-45',
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  )
}
