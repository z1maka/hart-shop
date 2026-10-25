'use client'

import Link, { useLinkStatus } from 'next/link'
import { Spinner } from '@/components/ui/Spinner'

type LoadMoreLinkProps = {
  readonly href: string
  readonly label: string
  readonly pendingLabel: string
}

// A real link to the longer list, so it works without JavaScript and every
// product stays reachable for a crawler. It replaces the address and keeps
// the scroll: the new products appear right under the ones already seen, and
// Back from a product returns to the whole list rather than step by step.
export function LoadMoreLink({ href, label, pendingLabel }: LoadMoreLinkProps) {
  return (
    <Link
      href={href}
      replace
      scroll={false}
      rel="nofollow"
      className="flex min-h-12 w-full max-w-sm items-center justify-center gap-2 rounded-control border-[1.5px] border-strong bg-raised px-5 text-[14px] font-semibold text-ink transition-colors hover:border-ink"
    >
      <LoadMoreLabel label={label} pendingLabel={pendingLabel} />
    </Link>
  )
}

function LoadMoreLabel({ label, pendingLabel }: Omit<LoadMoreLinkProps, 'href'>) {
  const { pending } = useLinkStatus()
  if (!pending) {
    return (
      <>
        {label}
        <span aria-hidden>↓</span>
      </>
    )
  }

  return (
    <>
      <Spinner />
      {pendingLabel}
    </>
  )
}
