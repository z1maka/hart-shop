import { REVIEW_REQUEST_AFTER_DAYS, REVIEW_REQUEST_WITHIN_DAYS } from '@/config/reviews'
import { NotificationKind } from '@/db/enums'
import { reviewFormUrl, reviewRequestWindow } from '@/features/orders/model/review-request'
import { orderRepository } from '@/features/orders/repository/order-repository'
import { orderMail } from '@/features/orders/services/order-mail'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'

// One daily run sees a day's handovers; the cap keeps a backlog short.
const REQUEST_BATCH_SIZE = 50

// A few days after the parcel was handed over the buyer is asked, once and
// by mail only — SMS is kept for the order and the waybill (owner,
// 26.09.2026) — how the product is. The first line of the order stands for
// the parcel: the ask names one product and links to its review form. An
// order without an email is marked as skipped and never revisited.
export const reviewRequestService = {
  async sendDue(now: Date): Promise<readonly string[]> {
    const due = await orderRepository.findDeliveredForReviewRequest({
      ...reviewRequestWindow(now, REVIEW_REQUEST_AFTER_DAYS, REVIEW_REQUEST_WITHIN_DAYS),
      askedKind: NotificationKind.ReviewRequestMail,
      limit: REQUEST_BATCH_SIZE,
    })

    const asked: string[] = []
    for (const order of due) {
      const [firstItem] = await orderRepository.findItems(order.id)
      if (!firstItem) continue

      const sent = await orderMail.sendReviewRequest(order, {
        name: firstItem.productTitle,
        url: reviewFormUrl(env.NEXT_PUBLIC_SITE_URL, firstItem.productSlug),
      })
      if (sent) asked.push(order.orderNumber)
    }

    if (asked.length > 0) logger.info('Review requests sent', { orderNumbers: asked })
    return asked
  },
}
