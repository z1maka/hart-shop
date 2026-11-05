import { GOOGLE_ADS_IMPORT } from '@/config/google-ads-import'
import { parseGoogleClick } from '@/features/analytics/model/google-click'
import {
  isGoogleAdsSale,
  toGoogleAdsConversionsCsv,
} from '@/features/orders/model/google-ads-conversions'
import { orderRepository } from '@/features/orders/repository/order-repository'
import { logger } from '@/lib/logger'

const MS_PER_DAY = 24 * 60 * 60 * 1000

// The file Google Ads fetches: the ad sales of the last days. Never cached —
// an order placed a minute ago belongs in the next fetch.
export async function googleAdsConversionsCsv(now: Date): Promise<string> {
  const from = new Date(now.getTime() - GOOGLE_ADS_IMPORT.lookbackDays * MS_PER_DAY)
  const candidates = await orderRepository.listGoogleAdsSaleCandidates(from)
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
