'use client'

import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type MobileFilterToggleProps = {
  readonly showLabel: string
  readonly hideLabel: string
  readonly activeFilterCount: number
  // Shares the toggle's row on a phone (the sort), so the first product
  // starts higher up the screen.
  readonly trailing?: ReactNode
  readonly children: ReactNode
}

// On a phone the full sidebar would push every product below the fold, so it
// starts collapsed there; from lg up it is always visible and the button hides.
export function MobileFilterToggle({
  showLabel,
  hideLabel,
  activeFilterCount,
  trailing,
  children,
}: MobileFilterToggleProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="w-full min-w-0 lg:w-[250px] lg:flex-none">
      <div className="flex gap-2 lg:hidden">
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          aria-expanded={isOpen}
          className="flex min-h-11 min-w-0 flex-1 items-center justify-between rounded-control border-[1.5px] border-strong bg-raised px-4 text-[13.5px] font-bold text-ink"
        >
          <span>
            {isOpen ? hideLabel : showLabel}
            {activeFilterCount > 0 ? ` · ${activeFilterCount}` : ''}
          </span>
          <span aria-hidden>{isOpen ? '−' : '+'}</span>
        </button>
        {trailing}
      </div>
      <div className={cn(isOpen ? 'block max-lg:mt-3' : 'hidden', 'lg:block')}>{children}</div>
    </div>
  )
}
