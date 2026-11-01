import { GOOGLE_ADS_IMPORT } from '@/config/google-ads-import'
import {
  isGoogleAdsSale,
  toGoogleAdsConversionsCsv,
} from '@/features/orders/model/google-ads-conversions'
import { orderRepository } from '@/features/orders/repository/order-repository'

const MS_PER_DAY = 24 * 60 * 60 * 1000

// The file Google Ads fetches: the ad sales of the last days. Never cached —
// an order placed a minute ago belongs in the next fetch.
export async function googleAdsConversionsCsv(now: Date): Promise<string> {
  const from = new Date(now.getTime() - GOOGLE_ADS_IMPORT.lookbackDays * MS_PER_DAY)
  const candidates = await orderRepository.listGoogleAdsSaleCandidates(from)

  return toGoogleAdsConversionsCsv(
    candidates.filter(isGoogleAdsSale),
    GOOGLE_ADS_IMPORT.conversionName,
  )
}
