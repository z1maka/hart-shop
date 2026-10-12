'use client'

import { useEffect, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { NovaPoshtaMark } from '@/components/ui/NovaPoshtaMark'
import { UaPhoneField, isUaPhoneComplete, maskUaPhone } from '@/components/ui/UaPhoneField'
import { PHONE_HANDOFF_KEY } from '@/features/checkout/model/phone-handoff'
import { trackEvent, type AnalyticsItem } from '@/features/analytics'
import { Carrier, DeliveryKind, PaymentRoute } from '@/db/enums'
import { deliveryKindsFor, MANUAL_PICKUP_POINT_REF, needsStreetAddress } from '@/config/delivery'
import { startCheckoutAction } from '@/features/checkout/actions/checkout-actions'
import { PickupPointPicker } from '@/features/checkout/ui/PickupPointPicker'
import { cn } from '@/lib/utils'
import { inputClassName } from '@/components/ui/Field'

type PaymentChoice = {
  readonly key: string
  readonly route: PaymentRoute
  // Null for the routes that involve no acquirer at all.
  readonly provider: string | null
}

type CheckoutFlowProps = {
  readonly totalLabel: string
  readonly totalCents: number
  readonly analyticsItems: readonly AnalyticsItem[]
  // One per acquirer the shop runs; the buyer picks which takes the money.
  readonly cardProviders: readonly string[]
  readonly pickupCarriers: readonly Carrier[]
  readonly parcelWeightGrams: number
  readonly isBankTransferAvailable: boolean
}

const STEPS = [
  { id: 1, key: 'contact' },
  { id: 2, key: 'delivery' },
  { id: 3, key: 'payment' },
] as const

const COUNTRY = 'UA'
const CARRIER = Carrier.NovaPost

// The same shape Zod's z.email() accepts on the server, so the two verdicts
// cannot disagree.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const inputClass = cn(inputClassName, 'font-normal')

function readHandedPhone(): string {
  if (typeof window === 'undefined') return ''
  try {
    return maskUaPhone(window.sessionStorage.getItem(PHONE_HANDOFF_KEY) ?? '')
  } catch {
    // Blocked storage just means starting with an empty field.
    return ''
  }
}

export function CheckoutFlow({
  totalLabel,
  totalCents,
  analyticsItems,
  cardProviders,
  pickupCarriers,
  parcelWeightGrams,
  isBankTransferAvailable,
}: CheckoutFlowProps) {
  const t = useTranslations('checkout')
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  // A phone typed into the cart's quick-order panel follows the person here.
  const [phone, setPhone] = useState(readHandedPhone)
  const [deliveryKind, setDeliveryKind] = useState<DeliveryKind>(DeliveryKind.Branch)
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [manualPoint, setManualPoint] = useState('')
  const [pickupPoint, setPickupPoint] = useState<{ ref: string; label: string } | null>(null)
  const [choiceKey, setChoiceKey] = useState<string>(PaymentRoute.CashOnDelivery)
  const [error, setError] = useState<string | null>(null)
  const [invalidFields, setInvalidFields] = useState<readonly string[]>([])
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    trackEvent({ name: 'begin_checkout', items: analyticsItems, valueCents: totalCents })
    // Once per checkout visit, not per re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The handoff is single-use; the read stays in the initializer because
  // StrictMode runs initializers twice and a consumed key would come back
  // empty on the second pass.
  useEffect(() => {
    try {
      window.sessionStorage.removeItem(PHONE_HANDOFF_KEY)
    } catch {
      // Blocked storage has nothing to clean up.
    }
  }, [])

  // Without the carrier's directory the shopper types the branch by hand — a
  // text field instead of a picker that cannot list anything.
  const hasDirectory = pickupCarriers.includes(CARRIER)
  const kinds = deliveryKindsFor(CARRIER)
  const wantsAddress = needsStreetAddress(deliveryKind)

  // Cash on delivery, then a line per acquirer, then the invoice. A card
  // choice carries the acquirer with it, so the order records who took it.
  const paymentChoices: PaymentChoice[] = [
    { key: PaymentRoute.CashOnDelivery, route: PaymentRoute.CashOnDelivery, provider: null },
    ...cardProviders.map((provider) => ({
      key: `card:${provider}`,
      route: PaymentRoute.Card,
      provider,
    })),
    ...(isBankTransferAvailable
      ? [{ key: PaymentRoute.BankTransfer, route: PaymentRoute.BankTransfer, provider: null }]
      : []),
  ]
  const choice = paymentChoices.find((entry) => entry.key === choiceKey) ?? paymentChoices[0]
  const paymentRoute = choice?.route ?? PaymentRoute.CashOnDelivery

  function fail(message: string, fields: readonly string[]) {
    setError(message)
    setInvalidFields(fields)
  }

  // The red outline goes away the moment the field is touched again: keeping
  // it lit while the person is already fixing it reads as "still wrong".
  function edit(field: string, apply: (value: string) => void) {
    return (value: string) => {
      apply(value)
      setInvalidFields((current) => current.filter((entry) => entry !== field))
    }
  }

  function goToDelivery() {
    if (email.trim() !== '' && !EMAIL_SHAPE.test(email.trim())) {
      fail(t('errors.email'), ['email'])
      return
    }
    if (firstName.trim().length < 2) {
      fail(t('errors.fullName'), ['firstName'])
      return
    }
    if (lastName.trim().length < 2) {
      fail(t('errors.fullName'), ['lastName'])
      return
    }
    if (!isUaPhoneComplete(phone)) {
      fail(t('errors.phone'), ['phone'])
      return
    }

    setError(null)
    setInvalidFields([])
    setStep(2)
  }

  function goToPayment() {
    if (wantsAddress) {
      if (city.trim() === '') {
        fail(t('errors.fillField', { field: t('addressFields.city') }), ['city'])
        return
      }
      if (street.trim() === '') {
        fail(t('errors.fillField', { field: t('addressFields.line1') }), ['line1'])
        return
      }
    } else if (hasDirectory) {
      if (!pickupPoint) {
        fail(t('errors.pickPoint'), [])
        return
      }
    } else if (manualPoint.trim().length < 3) {
      fail(t('errors.pickPoint'), ['manualPoint'])
      return
    }

    trackEvent({
      name: 'add_shipping_info',
      items: analyticsItems,
      valueCents: totalCents,
      shippingTier: t(`kinds.${deliveryKind}`),
    })

    setError(null)
    setInvalidFields([])
    setStep(3)
  }

  function destinationFields(
    addressFields: React.ReactNode,
    picker: React.ReactNode,
    manualField: React.ReactNode,
  ): React.ReactNode {
    if (wantsAddress) return addressFields
    if (hasDirectory) return picker
    return manualField
  }

  function resolvePickupPoint(): { ref: string; label: string } | undefined {
    if (wantsAddress) return undefined
    if (hasDirectory) return pickupPoint ?? undefined
    return { ref: MANUAL_PICKUP_POINT_REF, label: manualPoint.trim() }
  }

  function submitLabel(): string {
    return paymentRoute === PaymentRoute.Card
      ? t('pay', { amount: totalLabel })
      : t('placeOrder', { amount: totalLabel })
  }

  // Server errors reach the shopper in their own words, and a failure they can
  // fix leads them to where the fix lives instead of a dead-end message.
  function applyOrderError(code: string) {
    if (code === 'CART_NOT_FOUND') {
      window.location.assign('/cart/')
      return
    }
    if (code === 'VALIDATION_FAILED') {
      setStep(1)
      setError(t('errors.byCode.VALIDATION_FAILED'))
      return
    }
    if (code === 'PAYMENT_FAILED') {
      setError(t('errors.paymentUnavailable'))
      return
    }
    setError(t.has(`errors.byCode.${code}`) ? t(`errors.byCode.${code}`) : t('errors.byCode.UNEXPECTED'))
  }

  function placeOrder() {
    setError(null)
    startTransition(async () => {
      const chosenPoint = resolvePickupPoint()

      const result = await startCheckoutAction({
        email: email.trim() === '' ? undefined : email.trim(),
        carrier: CARRIER,
        deliveryKind,
        paymentRoute,
        cardProvider: choice?.provider ?? undefined,
        address: {
          fullName: `${firstName.trim()} ${lastName.trim()}`,
          line1: wantsAddress ? street.trim() : '',
          city: wantsAddress ? city.trim() : (chosenPoint?.label ?? '—'),
          phone: phone.trim(),
        },
        pickupPoint: chosenPoint,
      })

      if (!result.ok) {
        applyOrderError(result.error.code)
        return
      }

      // Card: the acquirer hosts the payment page. Offline routes: the order
      // page. Either way the shopper is handed over.
      window.location.assign(result.data)
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <ol className="flex gap-0.5 rounded-control bg-hover p-0.5">
        {STEPS.map((entry) => (
          <li key={entry.id} className="flex-1">
            <button
              type="button"
              disabled={entry.id > step}
              onClick={() => setStep(entry.id)}
              className={cn(
                'flex min-h-10 w-full items-center justify-center gap-2 rounded-chip text-[13px] font-semibold text-ink',
                step === entry.id && 'bg-surface shadow-tab',
                entry.id > step && 'text-faint',
              )}
            >
              <span className="text-faint">{entry.id}</span>
              {t(`steps.${entry.key}`)}
            </button>
          </li>
        ))}
      </ol>

      {step === 1 ? (
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            goToDelivery()
          }}
        >
          <h2 className="font-display text-h3 font-bold text-ink">{t('whoReceives')}</h2>

          {/* The phone first: it is how every order here is settled, and the
              address is the optional extra. */}
          <UaPhoneField
            name="phone"
            label={t('phoneLabel')}
            value={phone}
            hasError={invalidFields.includes('phone')}
            onChange={edit('phone', setPhone)}
          />

          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
            <label className="flex flex-col gap-1.5 text-[12.5px] font-semibold text-muted">
              {t('firstName')}
              <input
                type="text"
                autoComplete="given-name"
                required
                minLength={2}
                maxLength={60}
                value={firstName}
                onChange={(event) => edit('firstName', setFirstName)(event.target.value)}
                className={cn(inputClass, invalidFields.includes('firstName') && 'border-alert')}
              />
            </label>

            <label className="flex flex-col gap-1.5 text-[12.5px] font-semibold text-muted">
              {t('lastName')}
              <input
                type="text"
                autoComplete="family-name"
                required
                minLength={2}
                maxLength={60}
                value={lastName}
                onChange={(event) => edit('lastName', setLastName)(event.target.value)}
                className={cn(inputClass, invalidFields.includes('lastName') && 'border-alert')}
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5 text-[12.5px] font-semibold text-muted">
            {t('emailLabel')}
            <input
              type="email"
              autoComplete="email"
              maxLength={200}
              value={email}
              onChange={(event) => edit('email', setEmail)(event.target.value)}
              placeholder="you@example.com"
              className={cn(inputClass, invalidFields.includes('email') && 'border-alert')}
            />
          </label>

          <Button size="lg" type="submit" disabled={isPending}>
            {t('continueDelivery')}
          </Button>
        </form>
      ) : null}

      {step === 2 ? (
        <section className="flex flex-col gap-5">
          <h2 className="font-display text-h3 font-bold text-ink">{t('whereItGoes')}</h2>

          <div className="rounded-control bg-hover p-4">
            <p className="flex items-start gap-3 text-[13px] leading-relaxed text-muted">
              <NovaPoshtaMark size={28} />
              {t('carrierNote')}
            </p>
          </div>

          <div>
            <p className="mb-2.5 text-[12.5px] font-semibold text-muted">{t('howToReceive')}</p>
            <div className="flex flex-wrap gap-2">
              {kinds.map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => {
                    setDeliveryKind(kind)
                    setPickupPoint(null)
                  }}
                  className={cn(
                    'min-h-10 rounded-pill border px-4 text-[13px] font-semibold',
                    kind === deliveryKind
                      ? 'border-accent bg-accent-tint text-accent-hover'
                      : 'border-subtle bg-raised text-ink hover:border-accent',
                  )}
                >
                  {t(`kinds.${kind}`)}
                </button>
              ))}
            </div>
          </div>

          {destinationFields(
            <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5">
              <label className="col-span-full flex flex-col gap-1.5 text-[12.5px] font-semibold text-muted">
                {t('addressFields.line1')}
                <input
                  type="text"
                  autoComplete="address-line1"
                  maxLength={120}
                  value={street}
                  onChange={(event) => edit('line1', setStreet)(event.target.value)}
                  className={cn(inputClass, invalidFields.includes('line1') && 'border-alert')}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-[12.5px] font-semibold text-muted">
                {t('addressFields.city')}
                <input
                  type="text"
                  autoComplete="address-level2"
                  maxLength={120}
                  value={city}
                  onChange={(event) => edit('city', setCity)(event.target.value)}
                  className={cn(inputClass, invalidFields.includes('city') && 'border-alert')}
                />
              </label>
            </div>,
            // The key remounts the picker when the kind changes: a branch chosen
            // for over-the-counter pickup must not survive a switch to lockers.
            <PickupPointPicker
              key={deliveryKind}
              carrier={CARRIER}
              kind={deliveryKind}
              country={COUNTRY}
              countryName={t('countryName')}
              selected={pickupPoint}
              onSelect={setPickupPoint}
              parcelWeightGrams={parcelWeightGrams}
            />,
            <label
              key="manual"
              className="flex flex-col gap-1.5 text-[12.5px] font-semibold text-muted"
            >
              {t('manualPointLabel')}
              <input
                type="text"
                maxLength={200}
                placeholder={t('manualPointPlaceholder')}
                value={manualPoint}
                onChange={(event) => edit('manualPoint', setManualPoint)(event.target.value)}
                className={cn(inputClass, invalidFields.includes('manualPoint') && 'border-alert')}
              />
            </label>,
          )}

          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" size="lg" onClick={() => setStep(1)}>
              {t('back')}
            </Button>
            <Button size="lg" onClick={goToPayment} className="flex-1">
              {t('continuePayment')}
            </Button>
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="flex flex-col gap-5">
          <h2 className="font-display text-h3 font-bold text-ink">{t('payment')}</h2>

          <div className="grid gap-2.5">
            {paymentChoices.map((entry) => {
              const copyKey = entry.provider
                ? `cardProviders.${entry.provider}`
                : `routes.${entry.route}`

              return (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => setChoiceKey(entry.key)}
                  className={cn(
                    'flex min-h-14 flex-col justify-center gap-0.5 rounded-card border-[1.5px] p-3.5 text-left',
                    entry.key === choiceKey
                      ? 'border-accent bg-accent-tint'
                      : 'border-subtle bg-raised hover:border-accent',
                  )}
                >
                  <span className="text-[14px] font-semibold text-ink">
                    {t(`${copyKey}.title`)}
                  </span>
                  <span className="text-[12.5px] leading-relaxed text-muted">
                    {t(`${copyKey}.body`)}
                  </span>
                </button>
              )
            })}
          </div>


          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" size="lg" onClick={() => setStep(2)}>
              {t('back')}
            </Button>
            <Button size="lg" onClick={placeOrder} disabled={isPending} className="flex-1">
              {isPending ? t('placingOrder') : submitLabel()}
            </Button>
          </div>
        </section>
      ) : null}

      {error ? <p className="text-[13px] font-medium text-alert">{error}</p> : null}
    </div>
  )
}
