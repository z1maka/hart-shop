'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

type ExpandableTextProps = {
  readonly text: string
  readonly moreLabel: string
  readonly lessLabel: string
  readonly className?: string
}

// A catalogue lead fills the first screen of a phone and pushes the first
// product under the cookie banner, so there it starts at two lines; from lg up
// it is shown whole and the toggle hides. The full text is always in the HTML.
export function ExpandableText({ text, moreLabel, lessLabel, className }: ExpandableTextProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <>
      <p className={cn(className, !isExpanded && 'max-lg:line-clamp-2')}>{text}</p>
      <button
        type="button"
        onClick={() => setIsExpanded((current) => !current)}
        aria-expanded={isExpanded}
        className="mt-1 text-[13px] font-semibold text-accent underline underline-offset-4 hover:text-ink lg:hidden"
      >
        {isExpanded ? lessLabel : moreLabel}
      </button>
    </>
  )
}
