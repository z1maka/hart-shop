'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useEffect, useId, useState } from 'react'
import { ConsentState } from '@/features/analytics/model/consent'
import { useConsent } from '@/features/analytics/ui/use-consent'
import { cn } from '@/lib/utils'

// The banner can only appear once the page has hydrated and read the stored
// answer, a second or two in on a phone — often just as the buyer is aiming
// at a colour or the cart button underneath it. For this long after it
// appears it lets taps through to the page, so a tap meant for the product
// never lands on the banner's buttons.
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

// Owner's decision (27.10.2026): the closed banner is one short line and
// «Прийняти» — the long text about analytics and ads put buyers off. What
// the cookies do and the refusal open under «Детальніше».
function ConsentCard({ onAccept, onReject }: ConsentCardProps) {
  const t = useTranslations('consent')
  const [isArmed, setIsArmed] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const detailsId = useId()

  useEffect(() => {
    const timer = setTimeout(() => setIsArmed(true), TAP_GUARD_MS)
    return () => clearTimeout(timer)
  }, [])

  return (
    <aside
      aria-label={t('title')}
      className={cn(
        'fixed inset-x-2 bottom-2 z-50 rounded-card border border-on-dark/15 bg-ink p-2.5 text-on-dark shadow-float sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[400px] sm:p-4',
        'transition-transform duration-300 starting:translate-y-[120%] motion-reduce:transition-none',
        !isArmed && 'pointer-events-none',
      )}
    >
      <div className="flex items-center gap-3">
        <p className="min-w-0 flex-1 text-[13px] leading-snug">
          {t('short')}{' '}
          <button
            type="button"
            aria-expanded={isExpanded}
            aria-controls={detailsId}
            onClick={() => setIsExpanded((wasExpanded) => !wasExpanded)}
            className="whitespace-nowrap text-on-dark/75 underline underline-offset-4 hover:text-on-dark"
          >
            {isExpanded ? t('less') : t('details')}
          </button>
        </p>
        <button
          type="button"
          onClick={onAccept}
          className="min-h-9 shrink-0 rounded-control bg-accent px-6 text-[13px] font-semibold text-accent-fg hover:bg-accent-hover sm:min-h-10"
        >
          {t('accept')}
        </button>
      </div>

      <ConsentDetails id={detailsId} isExpanded={isExpanded} onReject={onReject} />
    </aside>
  )
}

type ConsentDetailsProps = {
  readonly id: string
  readonly isExpanded: boolean
  readonly onReject: () => void
}

function ConsentDetails({ id, isExpanded, onReject }: ConsentDetailsProps) {
  const t = useTranslations('consent')

  return (
    <div id={id} hidden={!isExpanded} className="mt-3 border-t border-on-dark/15 pt-3">
      <p className="mb-3 text-[12.5px] leading-relaxed text-on-dark/75">
        {t('body')}{' '}
        <Link href="/privacy-policy/" className="text-on-dark underline underline-offset-4">
          {t('policy')}
        </Link>
      </p>
      <button
        type="button"
        onClick={onReject}
        className="min-h-9 w-full rounded-control border border-on-dark/35 px-3 text-[13px] font-semibold text-on-dark hover:border-on-dark/70"
      >
        {t('reject')}
      </button>
    </div>
  )
}
