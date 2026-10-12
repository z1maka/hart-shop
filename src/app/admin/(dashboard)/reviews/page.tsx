import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ReviewModeration } from '@/features/admin/ui/ReviewModeration'

export const metadata: Metadata = { title: 'Отзывы' }

export default function AdminReviewsPage({ searchParams }: PageProps<'/admin/reviews'>) {
  return (
    <Suspense fallback={<p className="text-[13.5px] text-muted">Загружаем отзывы…</p>}>
      <ReviewModeration searchParams={searchParams} />
    </Suspense>
  )
}
