import Link from 'next/link'
import { ReviewStatus } from '@/db/enums'
import { getAdminReviews } from '@/features/admin/queries/get-admin-reviews'
import { AdminPager, pageFromSearchParams } from '@/features/admin/ui/AdminPager'
import { ReviewModerationControls } from '@/features/admin/ui/ReviewModerationControls'
import { PurchaseProof, RatingStars, type AdminReviewView } from '@/features/reviews'
import { cn } from '@/lib/utils'

type ReviewModerationProps = {
  readonly searchParams: PageProps<'/admin/reviews'>['searchParams']
}

const STATUS_TABS: readonly { value: ReviewStatus; label: string }[] = [
  { value: ReviewStatus.Pending, label: 'На модерации' },
  { value: ReviewStatus.Published, label: 'Опубликованы' },
  { value: ReviewStatus.Rejected, label: 'Отклонены' },
]

const PROOF_LABELS: Record<PurchaseProof, { label: string; className: string }> = {
  [PurchaseProof.OrderMatched]: {
    label: '✓ Номер совпал с заказом',
    className: 'bg-accent-soft text-accent-hover',
  },
  [PurchaseProof.OrderNotFound]: { label: 'Заказ не найден', className: 'bg-sunken text-muted' },
  [PurchaseProof.NoPhone]: { label: 'Без телефона', className: 'bg-sunken text-muted' },
  [PurchaseProof.Marketplace]: { label: 'Prom.ua', className: 'bg-sunken text-muted' },
}

function statusFromParam(value: string | string[] | undefined): ReviewStatus {
  return typeof value === 'string' && (Object.values(ReviewStatus) as string[]).includes(value)
    ? (value as ReviewStatus)
    : ReviewStatus.Pending
}

function searchFromParam(value: string | string[] | undefined): string | null {
  const text = typeof value === 'string' ? value.trim() : ''
  return text.length > 0 ? text : null
}

export async function ReviewModeration({ searchParams }: ReviewModerationProps) {
  const params = await searchParams
  const status = statusFromParam(params.status)
  const search = searchFromParam(params.q)
  const { rows, page, pageCount, counts } = await getAdminReviews({
    status,
    search,
    page: pageFromSearchParams(params.page),
  })

  return (
    <div>
      <h1 className="mb-3.5 font-display text-[19px] font-bold text-ink">Отзывы</h1>

      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap gap-1 rounded-pill border border-subtle bg-surface p-1">
          {STATUS_TABS.map((tab) => (
            <Link
              key={tab.value}
              href={hrefFor(tab.value, search)}
              aria-current={status === tab.value ? 'page' : undefined}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-pill px-3.5 py-2 text-[12.5px] font-semibold',
                status === tab.value ? 'bg-raised text-ink shadow-tab' : 'text-muted hover:text-ink',
              )}
            >
              {tab.label}
              <span className="text-[11.5px] font-semibold text-faint">{counts[tab.value]}</span>
            </Link>
          ))}
        </nav>

        <form action="/admin/reviews" className="flex items-center gap-2">
          <input type="hidden" name="status" value={status} />
          <input
            type="search"
            name="q"
            defaultValue={search ?? ''}
            placeholder="Товар, имя или текст"
            className="min-h-10 w-[260px] max-w-full rounded-control border-[1.5px] border-strong bg-raised px-3.5 text-[13px] text-ink placeholder:text-faint focus-visible:border-accent"
          />
        </form>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-card border border-subtle bg-surface p-5 text-[13.5px] text-muted">
          {search ? 'Ничего не нашлось.' : 'В этом статусе отзывов нет.'}
        </p>
      ) : null}

      <div className="grid gap-3">
        {rows.map((review) => (
          <ReviewRow key={review.id} review={review} />
        ))}
      </div>

      <AdminPager
        basePath="/admin/reviews"
        page={page}
        pageCount={pageCount}
        keptParams={{ status, ...(search ? { q: search } : {}) }}
      />

      <p className="mt-4 max-w-[80ch] text-[12.5px] leading-relaxed text-muted">
        Отклонённый отзыв автору не виден и на сайте не появляется — его можно вернуть. Правка
        текста не предусмотрена: либо публикуем как есть, либо отклоняем, чтобы не менять чужие
        слова.
      </p>
    </div>
  )
}

function hrefFor(status: ReviewStatus, search: string | null): string {
  const query = new URLSearchParams({ status })
  if (search) query.set('q', search)
  return `/admin/reviews?${query.toString()}`
}

function ReviewRow({ review }: { readonly review: AdminReviewView }) {
  const proof = PROOF_LABELS[review.proof]

  return (
    <article className="flex flex-wrap items-start gap-4 rounded-card border border-subtle bg-surface px-4.5 py-4">
      <div className="min-w-0 flex-[1_1_320px]">
        <p className="mb-1 text-[12px] text-muted">
          <Link
            href={`/product/${review.productSlug}`}
            className="font-semibold text-ink hover:text-accent-hover"
          >
            {review.productTitle}
          </Link>
          <span className="text-faint"> · {review.receivedAt}</span>
        </p>
        <div className="mb-2 flex flex-wrap items-center gap-2.5">
          <span className="text-[14px] font-semibold text-ink">{review.authorName}</span>
          <RatingStars rating={review.rating} label={`Оценка ${review.rating} из 5`} size="sm" />
          <span className={cn('rounded-pill px-2.5 py-1 text-[11px] font-semibold', proof.className)}>
            {proof.label}
          </span>
        </div>
        {review.body ? (
          <p className="text-[13px] leading-relaxed whitespace-pre-line text-ink">{review.body}</p>
        ) : null}
        {review.tags.length > 0 ? (
          <ul className={cn('flex flex-wrap gap-1.5', review.body && 'mt-2')}>
            {review.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-pill border border-subtle bg-raised px-2.5 py-1 text-[11.5px] text-muted"
              >
                {tag}
              </li>
            ))}
          </ul>
        ) : null}
        {!review.body && review.tags.length === 0 ? (
          <p className="text-[12.5px] text-faint">Только оценка, без текста.</p>
        ) : null}
        {review.warning ? (
          <p className="mt-2 inline-block rounded-control bg-alert-soft px-2.5 py-1.5 text-[12px] font-semibold text-alert">
            ⚠ {review.warning}
          </p>
        ) : null}
        {review.reply ? (
          <p className="mt-2 rounded-control bg-sunken px-3 py-2 text-[12.5px] leading-relaxed text-muted">
            <span className="font-semibold text-ink">Ответ магазина: </span>
            {review.reply}
          </p>
        ) : null}
        {review.phoneMasked ? (
          <p className="mt-2 text-[12px] text-faint">{review.phoneMasked}</p>
        ) : null}
      </div>

      <ReviewModerationControls reviewId={review.id} status={review.status} reply={review.reply} />
    </article>
  )
}
