import {
  googleAdsPushWindow,
  isGoogleAdsSale,
  toDataManagerSaleEvent,
  type PushWindow,
} from '@/features/orders/model/google-ads-conversions'
import { orderRepository } from '@/features/orders/repository/order-repository'
import { ingestConversionEvents, isDataManagerConfigured } from '@/lib/google-data-manager'

export type GoogleAdsPushReport = {
  readonly isConfigured: boolean
  readonly window: PushWindow | null
  // The order numbers sent, for the cron log: no click id, no buyer.
  readonly sent: readonly string[]
  // Google's id of the request, to look its processing up; null when nothing
  // went out.
  readonly requestId: string | null
}

const NOT_CONFIGURED: GoogleAdsPushReport = {
  isConfigured: false,
  window: null,
  sent: [],
  requestId: null,
}

export const googleAdsSalePush = {
  // Hourly (vercel.json): the ad sales old enough for Google go out in one
  // request. A failure throws, so the cron log shows it; the daily CSV fetch
  // books whatever a failed run missed.
  async pushDueSales(now: Date): Promise<GoogleAdsPushReport> {
    if (!isDataManagerConfigured()) return NOT_CONFIGURED

    const window = googleAdsPushWindow(now)
    const candidates = await orderRepository.listGoogleAdsSaleCandidates(window.from, window.to)
    const sales = candidates.filter(isGoogleAdsSale).flatMap((sale) => {
      const event = toDataManagerSaleEvent(sale)
      return event ? [{ orderNumber: sale.orderNumber, event }] : []
    })
    if (sales.length === 0) return { isConfigured: true, window, sent: [], requestId: null }

    const requestId = await ingestConversionEvents(sales.map((sale) => sale.event))
    return {
      isConfigured: true,
      window,
      sent: sales.map((sale) => sale.orderNumber),
      requestId,
    }
  },
}
