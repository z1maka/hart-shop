import { NotificationStatus, type NotificationKind } from '@/db/enums'
import { channelOf } from '@/features/orders/model/notifications'
import { notificationRepository } from '@/features/orders/repository/notification-repository'
import { logger } from '@/lib/logger'

// Runs one delivery and writes down how it went, under the order. Never
// throws: a message is a courtesy and the order is the fact, so a failure
// is reported to the admin and the log, and the log failing is only logged.
export async function deliverNotification(
  orderId: string,
  kind: NotificationKind,
  send: () => Promise<void>,
): Promise<boolean> {
  try {
    await send()
    await record(orderId, kind, NotificationStatus.Sent, null)
    return true
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    logger.error('Notification failed', { orderId, kind, reason })
    await record(orderId, kind, NotificationStatus.Failed, reason)
    return false
  }
}

// Nothing to send to; the reason is what the admin reads under the order.
export async function skipNotification(
  orderId: string,
  kind: NotificationKind,
  reason: string,
): Promise<null> {
  await record(orderId, kind, NotificationStatus.Skipped, reason)
  return null
}

async function record(
  orderId: string,
  kind: NotificationKind,
  status: NotificationStatus,
  detail: string | null,
): Promise<void> {
  try {
    await notificationRepository.record({ orderId, kind, channel: channelOf(kind), status, detail })
  } catch (error) {
    logger.error('Notification log write failed', { orderId, kind, error })
  }
}
