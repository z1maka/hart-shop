import { desc, eq } from 'drizzle-orm'
import { orderNotifications } from '@/db/schema'
import type { NotificationChannel, NotificationKind, NotificationStatus } from '@/db/enums'
import { db } from '@/lib/db'

export type NotificationRow = {
  readonly id: string
  readonly kind: NotificationKind
  readonly channel: NotificationChannel
  readonly status: NotificationStatus
  readonly detail: string | null
  readonly createdAt: Date
}

export type NotificationInput = {
  readonly orderId: string
  readonly kind: NotificationKind
  readonly channel: NotificationChannel
  readonly status: NotificationStatus
  readonly detail: string | null
}

const notificationColumns = {
  id: orderNotifications.id,
  kind: orderNotifications.kind,
  channel: orderNotifications.channel,
  status: orderNotifications.status,
  detail: orderNotifications.detail,
  createdAt: orderNotifications.createdAt,
}

export const notificationRepository = {
  async record(input: NotificationInput): Promise<void> {
    await db.insert(orderNotifications).values(input)
  },

  async listForOrder(orderId: string): Promise<NotificationRow[]> {
    return db
      .select(notificationColumns)
      .from(orderNotifications)
      .where(eq(orderNotifications.orderId, orderId))
      .orderBy(desc(orderNotifications.createdAt))
  },
}
