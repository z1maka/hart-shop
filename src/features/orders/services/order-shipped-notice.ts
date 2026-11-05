import { writesToRecipient } from '@/features/orders/model/channel-pricing'
import type { OrderRow } from '@/features/orders/repository/order-repository'
import { orderMail } from '@/features/orders/services/order-mail'
import { orderSms } from '@/features/orders/services/order-sms'

export type ShippedNoticeOutcome = {
  // null: no such channel for this buyer; boolean: whether it went out.
  readonly mailSent: boolean | null
  readonly smsSent: boolean | null
}

// The buyer hears once that the parcel is on its way, by every channel they
// gave: the mail with the tracking link, the SMS with the waybill number.
// The admin's own move to «Отправлен» and the hourly parcel check both go
// through here. A partner's customer hears nothing from the shop: the
// partner sells under their own name. Never throws: the status is saved already, so a failed
// message is reported, not rolled back.
export const orderShippedNotice = {
  async send(order: OrderRow): Promise<ShippedNoticeOutcome> {
    if (!writesToRecipient(order.channel)) return { mailSent: null, smsSent: null }

    const [mailSent, smsSent] = await Promise.all([
      orderMail.sendShippedNotice(order),
      orderSms.sendOrderShipped(order),
    ])
    return { mailSent, smsSent }
  },
}
