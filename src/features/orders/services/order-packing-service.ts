import { AUTO_PACK_AFTER_HOURS } from '@/config/delivery'
import { packingCutoff } from '@/features/orders/model/auto-packing'
import { QUICK_ORDER_POINT_REF } from '@/features/orders/model/quick-order'
import { orderRepository } from '@/features/orders/repository/order-repository'
import { logger } from '@/lib/logger'

// A run every quarter of an hour sees far fewer; the cap keeps one run short.
const PACK_BATCH_SIZE = 200

// The owner's rule (19.09.2026): an order is packed within two hours of
// arriving. The clock of a cash-on-delivery order starts when it is placed,
// of a card or transfer order when it is paid — an unpaid one may never be.
// A quick order waits until the call settles its branch.
export const orderPackingService = {
  async packDueOrders(now: Date): Promise<readonly string[]> {
    const cutoff = packingCutoff(now, AUTO_PACK_AFTER_HOURS)
    const packed = await orderRepository.packDue({
      placedBefore: cutoff,
      paidBefore: cutoff,
      unsettledPointRef: QUICK_ORDER_POINT_REF,
      limit: PACK_BATCH_SIZE,
    })

    if (packed.length > 0) logger.info('Orders packed on schedule', { orderNumbers: packed })
    return packed
  },
}
