import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

type CatalogPaginationProps = {
  readonly page: number
  readonly pageCount: number
  readonly hrefForPage: (page: number) => string
}

// Above this many pages the row shows a window around the current page, so the
// pagination always stays a single row — a phone included.
const FULL_ROW_UP_TO = 7

export function CatalogPagination({ page, pageCount, hrefForPage }: CatalogPaginationProps) {
  const t = useTranslations('pagination')
  if (pageCount < 2) return null

  return (
    <nav
      className="mt-7 flex items-center justify-center gap-1.5 sm:gap-2"
      aria-label={t('label')}
    >
      <ArrowLink
        href={hrefForPage(page - 1)}
        isDisabled={page === 1}
        label={t('previous')}
        side="left"
      />

      {visiblePages(page, pageCount).map((entry, index) =>
        entry === null ? (
          <span
            key={`gap-${index}`}
            aria-hidden
            className="flex min-h-10 min-w-6 items-center justify-center text-[13px] text-faint"
          >
            …
          </span>
        ) : (
          <Link
            key={entry}
            href={hrefForPage(entry)}
            aria-current={entry === page ? 'page' : undefined}
            className={cn(
              'flex min-h-10 min-w-9 items-center justify-center rounded-control border px-1 text-[13px] font-semibold transition-colors sm:min-w-10',
              entry === page
                ? 'border-accent bg-accent text-accent-fg'
                : 'border-subtle bg-surface text-ink hover:border-accent',
            )}
          >
            {entry}
          </Link>
        ),
      )}

      <ArrowLink
        href={hrefForPage(page + 1)}
        isDisabled={page === pageCount}
        label={t('next')}
        side="right"
      />
    </nav>
  )
}

// null marks a gap that renders as an ellipsis.
function visiblePages(page: number, pageCount: number): (number | null)[] {
  if (pageCount <= FULL_ROW_UP_TO) {
    return Array.from({ length: pageCount }, (_, index) => index + 1)
  }

  const around = [page - 1, page, page + 1].filter((entry) => entry > 1 && entry < pageCount)
  const pages: (number | null)[] = [1]

  if (around[0] !== undefined && around[0] > 2) pages.push(null)
  pages.push(...around)
  const last = around[around.length - 1]
  if (last !== undefined && last < pageCount - 1) pages.push(null)
  pages.push(pageCount)

  return pages
}

// The word fits comfortably from tablets up; a phone gets the arrow alone.
function ArrowLink({
  href,
  isDisabled,
  label,
  side,
}: {
  href: string
  isDisabled: boolean
  label: string
  side: 'left' | 'right'
}) {
  const content = (
    <>
      {side === 'left' ? <span aria-hidden>←</span> : null}
      <span className="hidden sm:inline">{label}</span>
      {side === 'right' ? <span aria-hidden>→</span> : null}
    </>
  )

  const baseClass =
    'flex min-h-10 min-w-10 items-center justify-center gap-1.5 rounded-control border px-2 text-[13px] font-semibold sm:px-3.5'

  if (isDisabled) {
    return (
      <span aria-hidden className={cn(baseClass, 'border-subtle bg-surface text-faint')}>
        {content}
      </span>
    )
  }

  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(baseClass, 'border-subtle bg-surface text-ink hover:border-accent')}
    >
      {content}
    </Link>
  )
}
