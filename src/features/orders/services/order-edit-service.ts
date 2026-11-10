import type { BankAccountDraft } from '@/config/requisites'
import { PaymentRoute, type SalesChannel } from '@/db/enums'
import { bankAccountService, requisitesSnapshot } from '@/features/billing'
import { listedUnitPriceCents } from '@/features/orders/model/channel-pricing'
import { variantLabelOf } from '@/features/catalog/model/product-view'
import { VARIANT_SEARCH_LIMIT } from '@/features/orders/model/order-edit'
import {
  orderEditRepository,
  type EditedTotals,
  type RequestedLine,
  type SwitchedPayment,
} from '@/features/orders/repository/order-edit-repository'
import { PaymentRouteUnavailableError } from '@/lib/errors'
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
  // Cash on delivery to a transfer to the ФОП or back (owner, 10.11.2026).
  // A transfer takes the active account's requisites, as checkout does.
  async switchPaymentRoute(
    orderId: string,
    to: PaymentRoute,
    switchedBy: string,
  ): Promise<SwitchedPayment> {
    const bankRequisites = to === PaymentRoute.BankTransfer ? await transferRequisites() : null
    const switched = await orderEditRepository.switchPaymentRoute(orderId, { to, bankRequisites })
    logger.info('Order payment route switched by admin', { orderId, switchedBy, ...switched })
    return switched
  },

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

async function transferRequisites(): Promise<BankAccountDraft> {
  const account = await bankAccountService.active()
  if (!account) throw new PaymentRouteUnavailableError(PaymentRoute.BankTransfer)
  return requisitesSnapshot(account)
}
