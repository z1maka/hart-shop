'use client'

import Script from 'next/script'
import { CONSENT_POLICY } from '@/config/consent'
import { shouldLoadTags } from '@/features/analytics/model/consent'
import { useConsent } from '@/features/analytics/ui/use-consent'

export type GoogleReviewsOptInProps = {
  readonly merchantId: number
  readonly orderId: string
  readonly email: string
  readonly deliveryCountry: string
  // YYYY-MM-DD.
  readonly estimatedDeliveryDate: string
}

type SurveyOptInOptions = {
  readonly merchant_id: number
  readonly order_id: string
  readonly email: string
  readonly delivery_country: string
  readonly estimated_delivery_date: string
}

type SurveyWindow = Window & {
  gapi?: {
    load: (module: string, callback: () => void) => void
    surveyoptin?: { render: (options: SurveyOptInOptions) => void }
  }
}

const PLATFORM_SCRIPT_URL = 'https://apis.google.com/js/platform.js'
// The opt-in dialog follows ___gcfg, which has to exist before platform.js runs.
const LANGUAGE_SCRIPT = "window.___gcfg = { lang: 'uk' };"
const OFFERED_KEY_PREFIX = 'hart_reviews_optin_'

// Google Customer Reviews: on the order page right after checkout, Google
// offers the buyer a survey email about the shop — the only source of the
// store rating its ads show. Asked once per order: a buyer back to track the
// parcel is not asked again. A visitor who refused the ad cookies is not
// asked at all.
export function GoogleReviewsOptIn(props: GoogleReviewsOptInProps) {
  const { state, isResolved } = useConsent()

  if (!isResolved || !shouldLoadTags(state, CONSENT_POLICY)) return null

  return (
    <>
      <Script id="google-reviews-language" strategy="afterInteractive">
        {LANGUAGE_SCRIPT}
      </Script>
      <Script
        src={PLATFORM_SCRIPT_URL}
        strategy="afterInteractive"
        onLoad={() => offerSurvey(props)}
      />
    </>
  )
}

function offerSurvey(props: GoogleReviewsOptInProps): void {
  if (wasOffered(props.orderId)) return

  const gapi = (window as SurveyWindow).gapi
  gapi?.load('surveyoptin', () => {
    gapi.surveyoptin?.render({
      merchant_id: props.merchantId,
      order_id: props.orderId,
      email: props.email,
      delivery_country: props.deliveryCountry,
      estimated_delivery_date: props.estimatedDeliveryDate,
    })
  })
}

// Marks the order as offered while checking, so a reload never asks twice.
function wasOffered(orderId: string): boolean {
  const key = `${OFFERED_KEY_PREFIX}${orderId}`
  try {
    if (window.localStorage.getItem(key)) return true
    window.localStorage.setItem(key, '1')
  } catch {
    // Blocked storage: the offer still shows, at worst once per visit.
  }
  return false
}
