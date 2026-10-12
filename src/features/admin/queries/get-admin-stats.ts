import { cache } from 'react'
import {
  adminStatsRepository,
  type AdminCounts,
} from '@/features/admin/repository/admin-stats-repository'
import { requireAdminSession } from '@/features/admin/session-cookie'

export type AdminStat = {
  readonly label: string
  readonly value: string
  // Work waiting for the admin: shown louder than a plain figure.
  readonly isAttention: boolean
}

// The header figures and the tab badges read the same counts; one query per
// request serves both.
const countEverything = cache(async (): Promise<AdminCounts> => {
  await requireAdminSession()
  return adminStatsRepository.countEverything()
})

export async function getAdminStats(): Promise<AdminStat[]> {
  const counts = await countEverything()

  return [
    {
      label: 'заказов ждут ТТН',
      value: String(counts.ordersAwaitingWaybill),
      isAttention: counts.ordersAwaitingWaybill > 0,
    },
    {
      label: 'заявок без ответа',
      value: String(counts.unansweredEnquiries),
      isAttention: counts.unansweredEnquiries > 0,
    },
    {
      label: 'отзывов на модерации',
      value: String(counts.pendingReviews),
      isAttention: counts.pendingReviews > 0,
    },
    { label: 'товаров в каталоге', value: String(counts.liveProducts), isAttention: false },
  ]
}

// Unfinished work per admin section, keyed by the tab's href; a section with
// nothing waiting is simply absent.
export type TabBadges = Readonly<Record<string, number>>

export async function getAdminTabBadges(): Promise<TabBadges> {
  const counts = await countEverything()

  return Object.fromEntries(
    [
      ['/admin/orders', counts.ordersAwaitingWaybill],
      ['/admin/enquiries', counts.unansweredEnquiries],
      ['/admin/reviews', counts.pendingReviews],
    ].filter(([, total]) => Number(total) > 0),
  )
}
