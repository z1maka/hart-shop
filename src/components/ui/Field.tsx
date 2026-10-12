import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type FieldProps = {
  readonly label: string
  readonly children: ReactNode
  readonly className?: string
  // What the last save objected to in this field; marks the control and
  // prints the reason under it.
  readonly error?: string
}

export function Field({ label, children, className, error }: FieldProps) {
  return (
    <label
      className={cn(
        'flex flex-col gap-1.5',
        // The refused control is focused on arrival, so the red must survive
        // the focus ring's own colour.
        error &&
          '[&_input]:border-alert [&_input:focus-visible]:border-alert [&_select]:border-alert [&_select:focus-visible]:border-alert [&_textarea]:border-alert [&_textarea:focus-visible]:border-alert',
        className,
      )}
      data-invalid={error ? 'true' : undefined}
    >
      <span className="text-[12.5px] font-bold text-muted">{label}</span>
      {children}
      {error ? <span className="text-[12px] font-medium text-alert">{error}</span> : null}
    </label>
  )
}

export const inputClassName =
  'min-h-[46px] rounded-control border-[1.5px] border-strong bg-raised px-3.5 text-[14px] text-ink placeholder:text-faint focus-visible:border-accent'

export const textareaClassName =
  'min-h-28 rounded-control border-[1.5px] border-strong bg-raised px-3.5 py-3 text-[14px] text-ink placeholder:text-faint focus-visible:border-accent'

export const invalidInputClassName = 'border-alert focus-visible:border-alert'
