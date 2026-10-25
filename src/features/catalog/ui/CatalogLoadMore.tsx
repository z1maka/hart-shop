import { useTranslations } from 'next-intl'
import { LoadMoreLink } from '@/features/catalog/ui/LoadMoreLink'

type CatalogLoadMoreProps = {
  // How far into the list the shown products reach, and how long it is.
  readonly shown: number
  readonly total: number
  readonly pageCount: number
  // The longer list, or null once everything is on the page.
  readonly nextHref: string | null
  readonly nextCount: number
}

const PERCENT = 100

// Phones and tablets page through the catalogue by adding to it: one thumb
// tap under the last card instead of aiming at page numbers. Wider screens
// keep the numbered pagination.
export function CatalogLoadMore({
  shown,
  total,
  pageCount,
  nextHref,
  nextCount,
}: CatalogLoadMoreProps) {
  const t = useTranslations('pagination')
  if (pageCount < 2) return null

  return (
    <div className="mt-7 flex flex-col items-center gap-3 lg:hidden">
      <p aria-live="polite" className="text-[13px] text-muted">
        {nextHref ? t('shownOf', { shown, total }) : t('allShown', { total })}
      </p>
      <div aria-hidden className="h-1 w-40 overflow-hidden rounded-full bg-sunken">
        <span
          className="block h-full rounded-full bg-accent"
          style={{ width: `${Math.min(PERCENT, Math.round((shown / total) * PERCENT))}%` }}
        />
      </div>
      {nextHref ? (
        <LoadMoreLink
          href={nextHref}
          label={t('loadMore', { count: nextCount })}
          pendingLabel={t('loading')}
        />
      ) : null}
    </div>
  )
}
