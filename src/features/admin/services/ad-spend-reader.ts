import {
  AdSpendState,
  type AdSpendReport,
  type AdSpendSource,
} from '@/features/admin/model/ad-spend'
import { GoogleApiUnavailableError } from '@/lib/errors'
import { logger } from '@/lib/logger'

// A failing ad source costs the board its ads line, never the earnings above
// it: those come from our own database and stay right.
export async function readAdSpend(
  source: AdSpendSource,
  from: string,
  to: string,
): Promise<AdSpendReport> {
  try {
    return await source.dailySpend(from, to)
  } catch (error) {
    if (!(error instanceof GoogleApiUnavailableError)) throw error

    logger.warn('Ad spend is unavailable', { error })
    return { state: AdSpendState.Failed }
  }
}
