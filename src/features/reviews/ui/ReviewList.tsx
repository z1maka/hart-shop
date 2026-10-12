'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { ReviewCard } from '@/features/reviews/ui/ReviewCard'
import type { ReviewView } from '@/features/reviews/queries/get-product-reviews'

// Three at first: enough to get a feel for the product without pushing the
// companion products off the screen. The rest open in place.
const INITIAL_COUNT = 3

export function ReviewList({ reviews }: { readonly reviews: readonly ReviewView[] }) {
  const t = useTranslations('reviews')
  const [isExpanded, setIsExpanded] = useState(false)
  const visible = isExpanded ? reviews : reviews.slice(0, INITIAL_COUNT)
  const hiddenCount = reviews.length - visible.length

  return (
    <div className="grid gap-3">
      {visible.map((review) => (
        <ReviewCard key={review.id} review={review} />
      ))}
      {hiddenCount > 0 ? (
        <Button variant="secondary" onClick={() => setIsExpanded(true)} className="justify-self-center">
          {t('showMore', { count: hiddenCount })}
        </Button>
      ) : null}
    </div>
  )
}
