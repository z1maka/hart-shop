import { describe, expect, it } from 'vitest'
import { NotificationKind, NotificationStatus } from '@/db/enums'
import { channelOf } from '@/features/orders/model/notifications'
import {
  NOTIFICATION_KIND_LABELS,
  NOTIFICATION_STATUS_LABELS,
} from '@/features/admin/ui/notification-labels'

describe('notification kinds', () => {
  it('every kind has a channel and an admin label', () => {
    for (const kind of Object.values(NotificationKind)) {
      expect(channelOf(kind)).toBeTruthy()
      expect(NOTIFICATION_KIND_LABELS[kind]).toBeTruthy()
    }
    for (const status of Object.values(NotificationStatus)) {
      expect(NOTIFICATION_STATUS_LABELS[status]).toBeTruthy()
    }
  })
})
