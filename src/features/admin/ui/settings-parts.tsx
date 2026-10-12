import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// Pieces shared by the settings boards (Nova Poshta cabinets, bank accounts):
// a labelled fact on a card and a text action under it.

export function Fact({
  label,
  value,
  isMonospace = false,
}: {
  readonly label: string
  readonly value: string
  // IBANs and keys read against a statement better in a fixed-width face.
  readonly isMonospace?: boolean
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11.5px] font-semibold tracking-[0.03em] text-faint uppercase">
        {label}
      </dt>
      <dd
        className={cn(
          'mt-0.5 text-[13px] font-medium break-words text-ink',
          isMonospace && 'font-mono tracking-[0.02em]',
        )}
      >
        {value}
      </dd>
    </div>
  )
}

export function RowAction({
  onClick,
  tone,
  children,
}: {
  readonly onClick: () => void
  readonly tone?: 'alert'
  readonly children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'text-[12.5px] font-semibold',
        tone === 'alert' ? 'text-alert hover:underline' : 'text-accent-hover hover:underline',
      )}
    >
      {children}
    </button>
  )
}
