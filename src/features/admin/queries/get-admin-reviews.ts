import type { ReviewStatus } from '@/db/enums'
import { requireAdminSession } from '@/features/admin/session-cookie'
import { listReviewsForAdmin, type AdminReviewPage } from '@/features/reviews'

const ADMIN_REVIEWS_PER_PAGE = 20

export async function getAdminReviews(input: {
  readonly status: ReviewStatus
  readonly search: string | null
  readonly page: number
}): Promise<AdminReviewPage> {
  await requireAdminSession()

  return listReviewsForAdmin({ ...input, perPage: ADMIN_REVIEWS_PER_PAGE })
}
