'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { isUaPhoneComplete, UaPhoneInput } from '@/components/ui/UaPhoneField'
import { trackEvent, type AnalyticsItem } from '@/features/analytics'
import { quickOrderAction } from '@/features/checkout/actions/checkout-actions'
import { PHONE_HANDOFF_KEY } from '@/features/checkout/model/phone-handoff'

type QuickOrderPanelProps = {
  readonly totalLabel: string
  readonly totalCents: number
  readonly analyticsItems: readonly AnalyticsItem[]
  readonly isCardPaymentAvailable: boolean
}

// The cart's "order in 30 seconds" panel (owner's design, 17.09.2026): one
// phone field and a button. Anyone who wants to name the recipient, pick a
// branch or pay by card goes to the standard checkout instead.
export function QuickOrderPanel({
  totalLabel,
  totalCents,
  analyticsItems,
  isCardPaymentAvailable,
}: QuickOrderPanelProps) {
  const t = useTranslations('cart')
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function placeQuickOrder() {
    if (!isUaPhoneComplete(phone)) {
      setError(t('quickOrder.errors.phone'))
      return
    }

    setError(null)
    trackEvent({ name: 'begin_checkout', items: analyticsItems, valueCents: totalCents })

    startTransition(async () => {
      const result = await quickOrderAction({ phone })

      if (result.ok) {
        router.push(result.data)
        return
      }
      const code = result.error.code
      setError(
        t.has(`quickOrder.errors.byCode.${code}`)
          ? t(`quickOrder.errors.byCode.${code}`)
          : t('quickOrder.errors.byCode.UNEXPECTED'),
      )
    })
  }

  return (
    <div className="rounded-card border-[1.5px] border-accent bg-accent-tint p-4.5">
      <p className="font-display text-[17px] font-bold tracking-tight text-ink">
        {t('quickOrder.title')}
      </p>
      <p className="mt-0.5 mb-3.5 text-[12.5px] leading-relaxed text-muted">
        {t('quickOrder.lead')}
      </p>

      <label className="flex flex-col gap-1.5 text-[12.5px] font-semibold text-muted">
        {t('quickOrder.phoneLabel')}
        <UaPhoneInput
          name="quick-order-phone"
          value={phone}
          onChange={(next) => {
            setPhone(next)
            setError(null)
          }}
          hasError={error === t('quickOrder.errors.phone')}
          size="lg"
          isEmphasised
        />
      </label>

      <Button size="lg" onClick={placeQuickOrder} disabled={isPending} className="mt-3 w-full">
        {isPending ? t('quickOrder.submitting') : t('quickOrder.submit', { total: totalLabel })}
      </Button>

      {error ? <p className="mt-2.5 text-[12.5px] font-semibold text-alert">{error}</p> : null}

      {/* Second action, deliberately secondary: most buyers need one step,
          but the ones who came for a card or a courier must not have to hunt
          for the way there. */}
      <Button variant="secondary" size="lg" asChild className="mt-3 w-full">
        <Link
          href="/checkout"
          onClick={() => {
            if (phone === '') return
            try {
              window.sessionStorage.setItem(PHONE_HANDOFF_KEY, phone)
            } catch {
              // Blocked storage just means retyping the number there.
            }
          }}
        >
          <span className="flex flex-col items-center gap-0.5 py-2 text-center leading-tight">
            <span>{t('quickOrder.fullCheckout')}</span>
            <span className="text-[12px] font-medium text-muted">
              {isCardPaymentAvailable
                ? t('quickOrder.fullCheckoutCardHint')
                : t('quickOrder.fullCheckoutHint')}
            </span>
          </span>
        </Link>
      </Button>
    </div>
  )
}
