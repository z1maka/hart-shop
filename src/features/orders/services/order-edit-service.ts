import type { SalesChannel } from '@/db/enums'
import { listedUnitPriceCents } from '@/features/orders/model/channel-pricing'
import { variantLabelOf } from '@/features/catalog/model/product-view'
import { VARIANT_SEARCH_LIMIT } from '@/features/orders/model/order-edit'
import {
  orderEditRepository,
  type EditedTotals,
  type RequestedLine,
} from '@/features/orders/repository/order-edit-repository'
import { logger } from '@/lib/logger'
import { publicUrl } from '@/lib/storage'

// A variant the admin can add to an order, as the picker lists it, priced
// by the order's channel; null when that channel cannot sell it (no drop
// price for a partner).
export type AddableVariant = {
  readonly variantId: string
  readonly productSlug: string
  readonly sku: string
  readonly title: string
  readonly variantLabel: string
  readonly unitPriceCents: number | null
  readonly retailUnitPriceCents: number
  readonly unitCostCents: number | null
  readonly weightGrams: number
  readonly stockQty: number
  readonly imageUrl: string | null
}

export const orderEditService = {
  async editLines(
    orderId: string,
    lines: readonly RequestedLine[],
    editedBy: string,
  ): Promise<EditedTotals> {
    const totals = await orderEditRepository.editLines(orderId, lines)
    logger.info('Order lines edited by admin', { orderId, editedBy, ...totals })
    return totals
  },

  async findAddableVariants(search: string, channel: SalesChannel): Promise<AddableVariant[]> {
    const rows = await orderEditRepository.findAddableVariants(search, VARIANT_SEARCH_LIMIT)

    return rows.map((row) => ({
      variantId: row.variantId,
      productSlug: row.productSlug,
      sku: row.sku,
      title: row.productTitle,
      variantLabel: variantLabelOf(row.options),
      unitPriceCents: listedUnitPriceCents(channel, {
        retailCents: row.unitPriceCents,
        dropCents: row.dropUnitPriceCents,
      }),
      retailUnitPriceCents: row.unitPriceCents,
      unitCostCents: row.unitCostCents,
      weightGrams: row.weightGrams,
      stockQty: row.stockQty,
      imageUrl: row.imageStorageKey === null ? null : publicUrl(row.imageStorageKey),
    }))
  },
}
