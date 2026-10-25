import { AdSpendState, type AdSpendSource } from '@/features/admin/model/ad-spend'
import { fetchDailyAdCost, isGoogleAnalyticsConfigured } from '@/lib/google-analytics'

export const googleAnalyticsAdSpend: AdSpendSource = {
  async dailySpend(from, to) {
    if (!isGoogleAnalyticsConfigured()) return { state: AdSpendState.NotConnected }

    return { state: AdSpendState.Connected, days: await fetchDailyAdCost(from, to) }
  },
}
