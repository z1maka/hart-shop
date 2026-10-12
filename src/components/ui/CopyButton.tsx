'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

const CopyState = {
  Idle: 'idle',
  Copied: 'copied',
  Failed: 'failed',
} as const

type CopyState = (typeof CopyState)[keyof typeof CopyState]

const FEEDBACK_MS = 2000

type CopyButtonProps = {
  readonly value: string
  readonly labels: { readonly copy: string; readonly copied: string; readonly failed: string }
  // What is being copied, for a screen reader: every button on a row of
  // details says the same word otherwise.
  readonly subject: string
  readonly className?: string
}

export function CopyButton({ value, labels, subject, className }: CopyButtonProps) {
  const [state, setState] = useState<CopyState>(CopyState.Idle)

  useEffect(() => {
    if (state === CopyState.Idle) return
    const timer = setTimeout(() => setState(CopyState.Idle), FEEDBACK_MS)
    return () => clearTimeout(timer)
  }, [state])

  // The clipboard is missing outside a secure context and in some in-app
  // browsers, and refused without a gesture the browser trusts; either way
  // the buyer is told to copy by hand.
  function copy() {
    const clipboard: Clipboard | undefined = navigator.clipboard
    if (!clipboard) {
      setState(CopyState.Failed)
      return
    }

    clipboard.writeText(value).then(
      () => setState(CopyState.Copied),
      () => setState(CopyState.Failed),
    )
  }

  const text = {
    [CopyState.Idle]: labels.copy,
    [CopyState.Copied]: labels.copied,
    [CopyState.Failed]: labels.failed,
  }[state]

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`${labels.copy}: ${subject}`}
      className={cn(
        'inline-flex min-h-8 shrink-0 items-center rounded-chip border border-strong bg-raised px-3 text-[12px] font-semibold text-ink transition-colors hover:border-faint',
        state === CopyState.Copied && 'border-accent text-accent',
        className,
      )}
    >
      <span aria-live="polite">{text}</span>
    </button>
  )
}
