import {
  FEATURED_LIMIT,
  FEATURED_MODE_KEY,
  parseFeaturedMode,
  type FeaturedMode,
} from '@/config/storefront'
import { adminStorefrontRepository } from '@/features/admin/repository/admin-storefront-repository'
import { logger } from '@/lib/logger'
import { readShopSetting, writeShopSetting } from '@/lib/shop-settings'

export const storefrontAdminService = {
  async readMode(): Promise<FeaturedMode> {
    return parseFeaturedMode(await readShopSetting<string>(FEATURED_MODE_KEY))
  },

  // Switching to automatic keeps the list: the owner gets it back untouched
  // when they switch again, which is the whole point of a switch.
  async setMode(mode: FeaturedMode): Promise<void> {
    await writeShopSetting(FEATURED_MODE_KEY, mode)
    logger.info('Featured rail mode changed', { mode })
  },

  async setFeatured(slugs: readonly string[]): Promise<void> {
    await adminStorefrontRepository.replaceFeatured(slugs.slice(0, FEATURED_LIMIT))
    logger.info('Featured rail changed', { count: Math.min(slugs.length, FEATURED_LIMIT) })
  },
}
