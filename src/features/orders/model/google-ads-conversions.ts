import { OrderStatus, PaymentRoute } from '@/db/enums'

// One sale as Google Ads imports it: the click it came from, when, how much.
export type GoogleAdsSale = {
  readonly orderNumber: string
  readonly googleClickId: string
  readonly createdAt: Date
  readonly totalCents: number
  readonly currency: string
}

// What the repository reads to decide whether an order is a sale yet.
export type GoogleAdsSaleCandidate = GoogleAdsSale & {
  readonly status: OrderStatus
  readonly paymentRoute: PaymentRoute
  readonly paidAt: Date | null
}

const NOT_A_SALE: ReadonlySet<OrderStatus> = new Set([OrderStatus.Cancelled, OrderStatus.Refunded])
const KOPIYKAS_PER_HRYVNIA = 100
// Every row carries the buyer's consent: a buyer who refused tracking has no
// click saved on the order at all.
const CONSENT_GRANTED = 'Granted'
// Every sale is placed on the site, whichever ad brought the buyer.
const EVENT_SOURCE_WEB = 'WEB'
const HEADER = [
  'Google Click ID',
  'Conversion Name',
  'Conversion Time',
  'Conversion Value',
  'Conversion Currency',
  'Order ID',
  'Ad User Data',
  'Ad Personalization',
  'Event Source',
]
// Times go out in UTC with the offset in each row: Data Manager reads the
// first line as the header, so the legacy «Parameters:TimeZone» line would
// replace it. UTC keeps the Kyiv clock change from shifting a sale.
const UTC_OFFSET = '+00:00'

// A card order is a sale once paid; cash on delivery and a transfer are sales
// when placed, until cancelled.
export function isGoogleAdsSale(candidate: GoogleAdsSaleCandidate): boolean {
  if (NOT_A_SALE.has(candidate.status)) return false
  return candidate.paymentRoute !== PaymentRoute.Card || candidate.paidAt !== null
}

// The file Google Ads reads: the header, one row a sale.
export function toGoogleAdsConversionsCsv(
  sales: readonly GoogleAdsSale[],
  conversionName: string,
): string {
  const rows = sales.map((sale) =>
    [
      sale.googleClickId,
      conversionName,
      formatConversionTime(sale.createdAt),
      (sale.totalCents / KOPIYKAS_PER_HRYVNIA).toFixed(2),
      sale.currency,
      sale.orderNumber,
      CONSENT_GRANTED,
      CONSENT_GRANTED,
      EVENT_SOURCE_WEB,
    ].join(','),
  )
  return [HEADER.join(','), ...rows].join('\n') + '\n'
}

// «yyyy-MM-dd HH:mm:ss+00:00», one of the formats Google Ads accepts with a zone.
function formatConversionTime(date: Date): string {
  return `${date.toISOString().slice(0, 19).replace('T', ' ')}${UTC_OFFSET}`
}
