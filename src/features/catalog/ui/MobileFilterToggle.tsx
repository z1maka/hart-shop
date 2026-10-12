'use client'

import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type MobileFilterToggleProps = {
  readonly showLabel: string
  readonly hideLabel: string
  readonly activeFilterCount: number
  readonly children: ReactNode
}

// On a phone the full sidebar would push every product below the fold, so it
// starts collapsed there; from lg up it is always visible and the button hides.
export function MobileFilterToggle({
  showLabel,
  hideLabel,
  activeFilterCount,
  children,
}: MobileFilterToggleProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="w-full min-w-0 lg:w-auto lg:min-w-[240px] lg:flex-[1_1_240px]">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        className="mb-3 flex min-h-11 w-full items-center justify-between rounded-control border border-strong bg-surface px-4 text-[13.5px] font-semibold text-ink lg:hidden"
      >
        <span>
          {isOpen ? hideLabel : showLabel}
          {activeFilterCount > 0 ? ` · ${activeFilterCount}` : ''}
        </span>
        <span aria-hidden>{isOpen ? '−' : '+'}</span>
      </button>
      <div className={cn(isOpen ? 'block' : 'hidden', 'lg:block')}>{children}</div>
    </div>
  )
}
