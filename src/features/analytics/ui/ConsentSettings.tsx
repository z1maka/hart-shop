'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { ConsentState } from '@/features/analytics/model/consent'
import { useConsent } from '@/features/analytics/ui/use-consent'

const STATE_KEY = {
  [ConsentState.Granted]: 'granted',
  [ConsentState.Denied]: 'denied',
  [ConsentState.Unknown]: 'unknown',
} as const

// The banner asks once; this is where the answer can be changed later.
export function ConsentSettings() {
  const t = useTranslations('privacyPage.consent')
  const { state, accept, reject } = useConsent()

  return (
    <div className="rounded-card border border-subtle bg-surface p-5">
      <p className="mb-1 text-[14px] font-semibold text-ink">{t('title')}</p>
      <p className="mb-4 text-[13.5px] leading-relaxed text-muted" aria-live="polite">
        {t(STATE_KEY[state])}
      </p>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <Button
          size="sm"
          onClick={accept}
          disabled={state === ConsentState.Granted}
          className="sm:w-auto"
        >
          {t('accept')}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={reject}
          disabled={state === ConsentState.Denied}
          className="sm:w-auto"
        >
          {t('reject')}
        </Button>
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-faint">{t('hint')}</p>
    </div>
  )
}
