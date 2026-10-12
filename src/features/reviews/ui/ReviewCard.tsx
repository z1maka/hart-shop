import { useTranslations } from 'next-intl'
import { RatingStars } from '@/features/reviews/ui/RatingStars'
import type { ReviewView } from '@/features/reviews/queries/get-product-reviews'

export function ReviewCard({ review }: { readonly review: ReviewView }) {
  const t = useTranslations('reviews')

  return (
    <article className="rounded-card border border-subtle bg-raised px-5 py-4.5">
      <header className="mb-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <span className="text-[14px] font-extrabold text-ink">{review.authorName}</span>
        {review.isVerifiedPurchase ? (
          <span className="rounded-chip bg-accent-soft px-2 py-[3px] text-[11px] font-bold text-accent">
            ✓ {t('verified')}
          </span>
        ) : null}
        <span className="ml-auto text-[12px] text-faint">{review.dateLabel}</span>
      </header>

      <div className="mb-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        <RatingStars rating={review.rating} label={t('ratingAria', { rating: review.rating })} size="sm" />
        {review.color ? (
          <span className="text-[12px] text-muted">{t('colorLabel', { color: review.color })}</span>
        ) : null}
      </div>

      <p className="text-[14px] leading-relaxed whitespace-pre-line text-ink">{review.body}</p>
      {review.tags.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {review.tags.map((tag) => (
            <li
              key={tag}
              className="rounded-chip border border-subtle bg-surface px-2.5 py-1 text-[12px] text-muted"
            >
              {tag}
            </li>
          ))}
        </ul>
      ) : null}

      {review.reply ? (
        <div className="mt-3 border-l-[3px] border-khaki-mark bg-accent-tint px-3.5 py-2.5">
          <p className="mb-0.5 flex flex-wrap items-baseline gap-x-2 text-[12px] font-extrabold text-accent">
            {t('shopReply')}
            <span className="font-normal text-faint">{review.reply.dateLabel}</span>
          </p>
          <p className="text-[13px] leading-relaxed whitespace-pre-line text-ink">{review.reply.body}</p>
        </div>
      ) : null}
    </article>
  )
}
