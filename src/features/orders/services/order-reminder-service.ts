import { QUICK_ORDER_CALL_REMINDER_AFTER_HOURS } from '@/config/delivery'
import { NotificationKind } from '@/db/enums'
import { reminderCutoff, waitingHours } from '@/features/orders/model/reminders'
import { orderRepository } from '@/features/orders/repository/order-repository'
import { orderTelegram } from '@/features/orders/services/order-telegram'
import { logger } from '@/lib/logger'
import { adminUrl } from '@/lib/urls'

// A run every half hour sees a handful at most; the cap keeps one run short.
const REMINDER_BATCH_SIZE = 50

// A phone-only order nobody has called back after the delay is put in front
// of the team once: the buyer is waiting for the call, not for a parcel.
export const orderReminderService = {
  async remindQuickOrders(now: Date): Promise<readonly string[]> {
    const due = await orderRepository.findQuickOrdersAwaitingCall({
      placedBefore: reminderCutoff(now, QUICK_ORDER_CALL_REMINDER_AFTER_HOURS),
      remindedKind: NotificationKind.QuickOrderReminderTelegram,
      limit: REMINDER_BATCH_SIZE,
    })

    const reminded: string[] = []
    for (const order of due) {
      const sent = await orderTelegram.sendQuickOrderReminder({
        orderId: order.id,
        orderNumber: order.orderNumber,
        waitingHours: waitingHours(order.createdAt, now),
        recipient: order.shippingAddress.fullName,
        phone: order.shippingAddress.phone ?? null,
        items: await orderRepository.findItems(order.id),
        adminOrderUrl: adminUrl(`/admin/orders/${order.id}/`),
      })
      if (sent) reminded.push(order.orderNumber)
    }

    if (reminded.length > 0) logger.info('Quick orders reminded', { orderNumbers: reminded })
    return reminded
  },
}
