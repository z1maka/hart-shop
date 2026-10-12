import { and, count, eq, inArray, isNull, ne, or } from 'drizzle-orm'
import { enquiries, orders, productReviews, products } from '@/db/schema'
import { EnquiryStatus, OrderStatus, PaymentRoute, ProductStatus, ReviewStatus } from '@/db/enums'
import { db } from '@/lib/db'

export type AdminCounts = {
  readonly liveProducts: number
  readonly ordersAwaitingWaybill: number
  readonly unansweredEnquiries: number
  readonly pendingReviews: number
}

export const adminStatsRepository = {
  async countEverything(): Promise<AdminCounts> {
    const [[productRow], [orderRow], [enquiryRow], [reviewRow]] = await Promise.all([
      db
        .select({ live: count() })
        .from(products)
        .where(ne(products.status, ProductStatus.Archived)),
      // The admin's daily round: every order to ship that has no waybill
      // yet — a cash-on-delivery order from the moment it is placed, a card
      // or transfer order once it is paid, and either of them after the
      // two-hour auto-packing has moved it to Packed.
      db
        .select({ awaiting: count() })
        .from(orders)
        .where(
          and(
            isNull(orders.trackingNumber),
            or(
              inArray(orders.status, [OrderStatus.Paid, OrderStatus.Packed]),
              and(
                eq(orders.status, OrderStatus.Pending),
                eq(orders.paymentRoute, PaymentRoute.CashOnDelivery),
              ),
            ),
          ),
        ),
      db
        .select({ unanswered: count() })
        .from(enquiries)
        .where(eq(enquiries.status, EnquiryStatus.New)),
      db
        .select({ pending: count() })
        .from(productReviews)
        .where(eq(productReviews.status, ReviewStatus.Pending)),
    ])

    return {
      liveProducts: productRow?.live ?? 0,
      ordersAwaitingWaybill: orderRow?.awaiting ?? 0,
      unansweredEnquiries: enquiryRow?.unanswered ?? 0,
      pendingReviews: reviewRow?.pending ?? 0,
    }
  },
}
