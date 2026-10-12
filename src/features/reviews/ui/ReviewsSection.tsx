import { getTranslations } from 'next-intl/server'
import { formatAverage } from '@/features/reviews/model/review-summary'
import { getProductReviewsOrNone } from '@/features/reviews/queries/get-product-reviews'
import { RatingStars } from '@/features/reviews/ui/RatingStars'
import { ReviewForm } from '@/features/reviews/ui/ReviewForm'
import { ReviewList } from '@/features/reviews/ui/ReviewList'

type ReviewsSectionProps = {
  readonly productSlug: string
}

const PERCENT = 100

// After the product's own facts and before the companion products: the
// summary and the reviews on the left, the form beside them on a wide
// screen. The list is only the reviews with words; ratings without any are
// counted in the summary and its bars.
export async function ReviewsSection({ productSlug }: ReviewsSectionProps) {
  const [{ summary, reviews }, t] = await Promise.all([
    getProductReviewsOrNone(productSlug),
    getTranslations('reviews'),
  ])

  return (
    <section id="reviews" className="scroll-mt-24">
      <div className="mb-4.5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 className="font-display text-h2 font-bold text-ink">
          {t('title')}
          {summary.count > 0 ? (
            <span className="ml-2.5 font-medium text-faint">{summary.count}</span>
          ) : null}
        </h2>
        <p className="text-[12.5px] text-faint">{t('moderationNote')}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="grid gap-4">
          {summary.count > 0 ? (
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4 rounded-card bg-header px-5.5 py-5">
              <div>
                <p className="font-display text-[44px] leading-none font-bold text-on-dark">
                  {formatAverage(summary.average)}
                </p>
                <RatingStars
                  rating={Math.round(summary.average)}
                  label={t('ratingAria', { rating: formatAverage(summary.average) })}
                  tone="dark"
                  className="mt-2"
                />
                <p className="mt-1.5 text-[12.5px] text-on-dark-muted">
                  {t('count', { count: summary.count })}
                </p>
              </div>
              <ul className="grid min-w-[220px] flex-1 gap-1.5">
                {summary.histogram.map((bucket) => (
                  <li key={bucket.rating} className="grid grid-cols-[3ch_1fr_2.5ch] items-center gap-2.5 text-[12px] text-on-dark-muted">
                    <span>{bucket.rating} ★</span>
                    <span className="h-1.5 overflow-hidden bg-dark-line">
                      <span
                        className="block h-full bg-khaki"
                        style={{ width: `${(bucket.count / summary.count) * PERCENT}%` }}
                      />
                    </span>
                    <span className="text-right tabular-nums">{bucket.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="rounded-card border border-subtle bg-surface p-5 text-[13.5px] leading-relaxed text-muted">
              {t('emptyBody')}
            </p>
          )}

          {reviews.length > 0 ? <ReviewList reviews={reviews} /> : null}
        </div>

        <ReviewForm productSlug={productSlug} />
      </div>
    </section>
  )
}
