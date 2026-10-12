import { cn } from '@/lib/utils'

type SpinnerProps = {
  readonly className?: string
  // Announced to screen readers; without it the ring is decoration and the
  // surrounding control is expected to say what is being waited on.
  readonly label?: string
}

export function Spinner({ className, label }: SpinnerProps) {
  return (
    <span
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        'inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-subtle border-t-accent',
        className,
      )}
    />
  )
}
