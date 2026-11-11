import { GOOGLE_ADS_IMPORT } from '@/config/google-ads-import'
import { parseGoogleClick } from '@/features/analytics/model/google-click'
import {
  isGoogleAdsSale,
  toGoogleAdsConversionsCsv,
} from '@/features/orders/model/google-ads-conversions'
import { orderRepository } from '@/features/orders/repository/order-repository'
import { daysAgo } from '@/lib/datetime'
import { logger } from '@/lib/logger'

// The file Google Ads fetches: the ad sales of the last days. Never cached —
// an order placed a minute ago belongs in the next fetch.
export async function googleAdsConversionsCsv(now: Date): Promise<string> {
  const from = daysAgo(now, GOOGLE_ADS_IMPORT.lookbackDays)
  const candidates = await orderRepository.listGoogleAdsSaleCandidates(from, now)
  const sales = candidates.filter(isGoogleAdsSale)
  // The file leaves such a sale out; the log keeps Ads' missing count traceable.
  const unreadable = sales.filter((sale) => !parseGoogleClick(sale.googleClickId))
  if (unreadable.length > 0) {
    logger.warn('Google Ads upload skips sales with an unreadable click', {
      orderNumbers: unreadable.map((sale) => sale.orderNumber),
    })
  }

  return toGoogleAdsConversionsCsv(sales, GOOGLE_ADS_IMPORT.conversionName)
}
