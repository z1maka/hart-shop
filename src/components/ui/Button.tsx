import { Slot } from '@radix-ui/react-slot'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'dark' | 'khaki' | 'outlineOnDark' | 'quiet' | 'link'
type ButtonSize = 'sm' | 'md' | 'lg'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  readonly variant?: ButtonVariant
  readonly size?: ButtonSize
  readonly asChild?: boolean
  readonly children: ReactNode
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-fg hover:bg-accent-hover',
  secondary: 'border-[1.5px] border-strong bg-raised text-ink hover:border-ink',
  dark: 'bg-ink text-on-dark hover:bg-ink-hover',
  // The two for the dark header, footer and blocks.
  khaki: 'bg-khaki text-ink hover:bg-khaki-hover',
  outlineOnDark: 'border-[1.5px] border-dark-edge text-on-dark hover:border-khaki hover:text-khaki',
  quiet: 'border border-subtle bg-transparent text-muted hover:border-strong hover:text-ink',
  link: 'font-bold text-accent underline-offset-4 hover:underline',
}

// The large size is the brand's call to action: Oswald in capitals. The
// smaller ones stay in Manrope, the way the cards and forms set them.
const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 text-[13px] font-bold',
  md: 'min-h-11 px-4 text-[13.5px] font-bold',
  lg: 'min-h-[52px] px-6 font-display text-[15px] font-semibold tracking-[0.08em]',
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
        'inline-flex items-center justify-center gap-2 rounded-control transition-colors',
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
