import { getTranslations } from 'next-intl/server'
import { formatAverage } from '@/features/reviews/model/review-summary'
import { getProductReviewsOrNone } from '@/features/reviews/queries/get-product-reviews'
import { RatingStars } from '@/features/reviews/ui/RatingStars'

// Under the product name: the stars, the average and a way down to the
// reviews. Nothing while the product has no rating yet — an empty row of
// grey stars would say «nobody wanted this».
export async function ProductRatingLine({ slug }: { readonly slug: string }) {
  const { summary } = await getProductReviewsOrNone(slug)
  if (summary.count === 0) return null

  const t = await getTranslations('reviews')

  return (
    <a
      href="#reviews"
      className="mb-3 inline-flex items-center gap-2 text-[13px] font-medium text-muted hover:text-ink"
    >
      <RatingStars rating={Math.round(summary.average)} label={t('ratingAria', { rating: formatAverage(summary.average) })} size="sm" />
      <span>
        <span className="font-semibold text-ink">{formatAverage(summary.average)}</span>
        {' · '}
        {t('count', { count: summary.count })}
      </span>
    </a>
  )
}
