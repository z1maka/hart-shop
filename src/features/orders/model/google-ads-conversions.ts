import { GOOGLE_ADS_PUSH } from '@/config/google-ads-import'
import { OrderStatus, PaymentRoute, type SalesChannel } from '@/db/enums'
import { writesToRecipient } from '@/features/orders/model/channel-pricing'
import {
  GoogleClickKind,
  parseGoogleClick,
  type GoogleClick,
} from '@/features/analytics/model/google-click'
import { hoursAgo } from '@/lib/datetime'
import {
  DataManagerConsent,
  DataManagerEventSource,
  type DataManagerConversionEvent,
} from '@/lib/google-data-manager-events'
import { isQuietHour } from '@/lib/quiet-hours'

// One sale as Google Ads imports it: the click it came from (as the order
// keeps it), when, how much.
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
  readonly channel: SalesChannel
}

const NOT_A_SALE: ReadonlySet<OrderStatus> = new Set([OrderStatus.Cancelled, OrderStatus.Refunded])
const KOPIYKAS_PER_HRYVNIA = 100
// Every row carries the buyer's consent: a buyer who refused tracking has no
// click saved on the order at all.
const CONSENT_GRANTED = 'Granted'
// Every sale is placed on the site, whichever ad brought the buyer.
const EVENT_SOURCE_WEB = 'WEB'
// Each kind of click has its own column, which Data Manager maps to its field;
// a row fills the one its click is.
const CLICK_COLUMNS: readonly { readonly kind: GoogleClickKind; readonly header: string }[] = [
  { kind: GoogleClickKind.Gclid, header: 'Google Click ID' },
  { kind: GoogleClickKind.Gbraid, header: 'GBRAID' },
  { kind: GoogleClickKind.Wbraid, header: 'WBRAID' },
]
const HEADER = [
  ...CLICK_COLUMNS.map((column) => column.header),
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
const MS_PER_MINUTE = 60 * 1000
const HOURS_PER_DAY = 24

// A card order is a sale once paid; cash on delivery and a transfer are sales
// when placed, until cancelled. A partner's order came from no ad click: it
// is placed in the admin and carries none, and is kept out here as well.
export function isGoogleAdsSale(candidate: GoogleAdsSaleCandidate): boolean {
  if (!writesToRecipient(candidate.channel)) return false
  if (NOT_A_SALE.has(candidate.status)) return false
  return candidate.paymentRoute !== PaymentRoute.Card || candidate.paidAt !== null
}

// The file Google Ads reads: the header, one row a sale.
export function toGoogleAdsConversionsCsv(
  sales: readonly GoogleAdsSale[],
  conversionName: string,
): string {
  const rows = sales.flatMap((sale) => {
    const click = parseGoogleClick(sale.googleClickId)
    return click ? [toCsvRow(sale, click, conversionName)] : []
  })
  return [HEADER.join(','), ...rows].join('\n') + '\n'
}

function toCsvRow(sale: GoogleAdsSale, click: GoogleClick, conversionName: string): string {
  const clickCells = CLICK_COLUMNS.map((column) => (column.kind === click.kind ? click.id : ''))
  return [
    ...clickCells,
    conversionName,
    formatConversionTime(sale.createdAt),
    (sale.totalCents / KOPIYKAS_PER_HRYVNIA).toFixed(2),
    sale.currency,
    sale.orderNumber,
    CONSENT_GRANTED,
    CONSENT_GRANTED,
    EVENT_SOURCE_WEB,
  ].join(',')
}

// «yyyy-MM-dd HH:mm:ss+00:00», one of the formats Google Ads accepts with a zone.
function formatConversionTime(date: Date): string {
  return `${date.toISOString().slice(0, 19).replace('T', ' ')}${UTC_OFFSET}`
}

// The same sale as the Data Manager API takes it: the same time, value and
// order number as the CSV row, so Google matches the two and counts it once.
// Null for a click the shop cannot read, which the CSV leaves out as well.
export function toDataManagerSaleEvent(sale: GoogleAdsSale): DataManagerConversionEvent | null {
  const click = parseGoogleClick(sale.googleClickId)
  if (!click) return null

  return {
    adIdentifiers: { [click.kind]: click.id },
    eventTimestamp: sale.createdAt.toISOString(),
    transactionId: sale.orderNumber,
    conversionValue: sale.totalCents / KOPIYKAS_PER_HRYVNIA,
    currency: sale.currency,
    eventSource: DataManagerEventSource.Web,
    // The same consent the CSV rows carry, in Data Manager's spelling.
    consent: {
      adUserData: DataManagerConsent.Granted,
      adPersonalization: DataManagerConsent.Granted,
    },
  }
}

export type PushWindow = {
  readonly from: Date
  readonly to: Date
}

// The orders one hourly push reports: old enough for Google to accept their
// click, and placed since the window the previous run covered. The cron is
// hourly but sleeps through the quiet hours, so the first morning run
// reaches back to the last evening one.
export function googleAdsPushWindow(now: Date): PushWindow {
  const previousRun = lastRunBefore(now)
  const overlapMs = GOOGLE_ADS_PUSH.overlapMinutes * MS_PER_MINUTE
  return {
    from: new Date(hoursAgo(previousRun, GOOGLE_ADS_PUSH.delayHours).getTime() - overlapMs),
    to: hoursAgo(now, GOOGLE_ADS_PUSH.delayHours),
  }
}

function lastRunBefore(now: Date): Date {
  const hoursBack = Array.from({ length: HOURS_PER_DAY }, (_, index) => index + 1).find(
    (hours) => !isQuietHour(hoursAgo(now, hours)),
  )
  return hoursAgo(now, hoursBack ?? HOURS_PER_DAY)
}
