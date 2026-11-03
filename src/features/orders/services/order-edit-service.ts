import { variantLabelOf } from '@/features/catalog/model/product-view'
import {
  orderEditRepository,
  type EditedTotals,
  type RequestedLine,
} from '@/features/orders/repository/order-edit-repository'
import { logger } from '@/lib/logger'

// A few screens of matches; the admin types more of the name to narrow them.
const ADDABLE_VARIANTS_LIMIT = 20

// A variant the admin can add to an order, as the picker lists it.
export type AddableVariant = {
  readonly variantId: string
  readonly sku: string
  readonly title: string
  readonly variantLabel: string
  readonly unitPriceCents: number
  readonly stockQty: number
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

  async findAddableVariants(search: string): Promise<AddableVariant[]> {
    const rows = await orderEditRepository.findAddableVariants(search, ADDABLE_VARIANTS_LIMIT)

    return rows.map((row) => ({
      variantId: row.variantId,
      sku: row.sku,
      title: row.productTitle,
      variantLabel: variantLabelOf(row.options),
      unitPriceCents: row.unitPriceCents,
      stockQty: row.stockQty,
    }))
  },
}
