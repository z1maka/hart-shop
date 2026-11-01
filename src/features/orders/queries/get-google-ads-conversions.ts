import { GOOGLE_ADS_IMPORT } from '@/config/google-ads-import'
import {
  isGoogleAdsSale,
  toGoogleAdsConversionsCsv,
  type GoogleAdsSale,
} from '@/features/orders/model/google-ads-conversions'
import { orderRepository } from '@/features/orders/repository/order-repository'

const MS_PER_DAY = 24 * 60 * 60 * 1000
// Data Manager reads the columns off the first data row and refuses a file
// with only the header, which is all the shop had before its first ad sale.
// The click id matches no click, so Google rejects the row instead of booking
// it. Lives only while the HTTPS connection is being set up (owner, 1.11.2026).
const SETUP_SAMPLE_SALE: Omit<GoogleAdsSale, 'createdAt'> = {
  orderNumber: 'HART-SAMPLE-000000',
  googleClickId: 'DataManagerSetupSampleClickId',
  totalCents: 290_000,
  currency: 'UAH',
}

// The file Google Ads fetches: the ad sales of the last days. Never cached —
// an order placed a minute ago belongs in the next fetch.
export async function googleAdsConversionsCsv(now: Date): Promise<string> {
  const from = new Date(now.getTime() - GOOGLE_ADS_IMPORT.lookbackDays * MS_PER_DAY)
  const candidates = await orderRepository.listGoogleAdsSaleCandidates(from)

  return toGoogleAdsConversionsCsv(
    [...candidates.filter(isGoogleAdsSale), { ...SETUP_SAMPLE_SALE, createdAt: now }],
    GOOGLE_ADS_IMPORT.conversionName,
  )
}
