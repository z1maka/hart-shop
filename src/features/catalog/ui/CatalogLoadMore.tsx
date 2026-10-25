import { useTranslations } from 'next-intl'
import { LoadMoreLink } from '@/features/catalog/ui/LoadMoreLink'

type CatalogLoadMoreProps = {
  // 1-based positions of the first and the last card shown, of `total`.
  readonly shownFrom: number
  readonly shownTo: number
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
  shownFrom,
  shownTo,
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
        {progressText(t, { shownFrom, shownTo, total, isEnd: nextHref === null })}
      </p>
      <div aria-hidden className="h-1 w-40 overflow-hidden rounded-full bg-sunken">
        <span
          className="block h-full rounded-full bg-accent"
          style={{ width: `${Math.min(PERCENT, Math.round((shownTo / total) * PERCENT))}%` }}
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

// A list opened mid-way says which cards it holds; one that starts at the
// first card counts them, and says so when it has them all.
function progressText(
  t: ReturnType<typeof useTranslations<'pagination'>>,
  list: { shownFrom: number; shownTo: number; total: number; isEnd: boolean },
): string {
  if (list.shownFrom > 1) {
    return t('shownRange', { from: list.shownFrom, to: list.shownTo, total: list.total })
  }
  return list.isEnd
    ? t('allShown', { total: list.total })
    : t('shownOf', { shown: list.shownTo, total: list.total })
}
