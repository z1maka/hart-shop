'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { ConsentState } from '@/features/analytics/model/consent'
import { useConsent } from '@/features/analytics/ui/use-consent'
import { cn } from '@/lib/utils'

// The banner can only appear once the page has hydrated and read the stored
// answer, a second or two in on a phone — often just as the buyer is aiming
// at a colour or the cart button underneath it. For this long after it
// appears it lets taps through to the page, so a tap meant for the product
// never lands on «Лише необхідні» (which reloads the page).
const TAP_GUARD_MS = 600

export function ConsentBanner() {
  const { state, isResolved, accept, reject } = useConsent()

  if (!isResolved || state !== ConsentState.Unknown) return null

  return <ConsentCard onAccept={accept} onReject={reject} />
}

type ConsentCardProps = {
  readonly onAccept: () => void
  readonly onReject: () => void
}

function ConsentCard({ onAccept, onReject }: ConsentCardProps) {
  const t = useTranslations('consent')
  const [isArmed, setIsArmed] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsArmed(true), TAP_GUARD_MS)
    return () => clearTimeout(timer)
  }, [])

  return (
    <aside
      aria-label={t('title')}
      className={cn(
        // On a phone a short strip at the very bottom: one line of text and
        // the two buttons side by side, so it covers as little of the buy
        // area as it can. From sm up, the full card in the corner.
        'fixed inset-x-2 bottom-2 z-50 rounded-card border border-on-dark/15 bg-ink p-2.5 text-on-dark shadow-float sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[400px] sm:p-6',
        'transition-transform duration-300 starting:translate-y-[120%] motion-reduce:transition-none',
        !isArmed && 'pointer-events-none',
      )}
    >
      <div className="mb-2.5 hidden items-center gap-2.5 sm:flex">
        <span aria-hidden className="size-2 rounded-full bg-accent" />
        <p className="font-display text-[15.5px] font-bold">{t('title')}</p>
      </div>

      <p className="mb-2 text-[12px] leading-snug text-on-dark/80 sm:hidden">
        {t('bodyShort')}{' '}
        <Link href="/privacy-policy/" className="text-on-dark underline underline-offset-4">
          {t('moreShort')}
        </Link>
      </p>
      <p className="mb-5 hidden text-[13px] leading-relaxed text-on-dark/75 sm:block">
        {t('body')}{' '}
        <Link href="/privacy-policy/" className="text-on-dark underline underline-offset-4">
          {t('more')}
        </Link>
      </p>

      <div className="flex gap-2 sm:gap-2.5">
        <button
          type="button"
          onClick={onAccept}
          className="min-h-9 flex-1 rounded-control bg-accent px-3 text-[13px] font-semibold text-accent-fg hover:bg-accent-hover sm:min-h-11.5 sm:px-4 sm:text-[13.5px]"
        >
          {t('accept')}
        </button>
        <button
          type="button"
          onClick={onReject}
          className="min-h-9 flex-1 rounded-control border border-on-dark/35 px-3 text-[13px] font-semibold text-on-dark hover:border-on-dark/70 sm:min-h-11.5 sm:px-4 sm:text-[13.5px]"
        >
          {t('reject')}
        </button>
      </div>
    </aside>
  )
}
