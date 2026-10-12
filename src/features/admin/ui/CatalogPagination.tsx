import Link from 'next/link'
import type { ReactNode } from 'react'
import { ADMIN_PRODUCT_PAGE_SIZES, ADMIN_PRODUCTS_PER_PAGE } from '@/config/admin'
import {
  catalogHref,
  pageWindow,
  type CatalogFilters,
} from '@/features/admin/model/catalog-filters'
import type { AdminProductPage } from '@/features/admin/queries/get-admin-catalog'
import { NavigateSelect } from '@/features/admin/ui/NavigateSelect'
import { cn } from '@/lib/utils'

// The next page opens at the top of the list, not above the filters.
export const PRODUCT_LIST_ANCHOR = 'products'

const squareClass =
  'inline-flex size-9 items-center justify-center rounded-control border text-[13px] font-semibold'

type CatalogPaginationProps = {
  readonly filters: CatalogFilters
  readonly page: AdminProductPage
}

export function CatalogPagination({ filters, page }: CatalogPaginationProps) {
  const pageHref = (target: number) =>
    `${catalogHref(filters, { page: target }, ADMIN_PRODUCTS_PER_PAGE)}#${PRODUCT_LIST_ANCHOR}`
  const sizeOptions = ADMIN_PRODUCT_PAGE_SIZES.map((size) => ({
    value: String(size),
    label: String(size),
    href: catalogHref(filters, { pageSize: size }, ADMIN_PRODUCTS_PER_PAGE),
  }))

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-[12.5px] text-muted">
        {page.total === 0 ? 'Ничего не найдено' : `${page.from}–${page.to} из ${page.total}`}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        {page.pageCount > 1 ? (
          <nav className="flex items-center gap-1.5" aria-label="Страницы">
            <PageSquare href={page.page > 1 ? pageHref(page.page - 1) : null} label="Назад">
              ←
            </PageSquare>
            {pageWindow(page.page, page.pageCount).map((slot, index) =>
              slot === 'gap' ? (
                <span key={`gap-${index}`} className="px-1 text-[13px] text-muted">
                  …
                </span>
              ) : (
                <PageSquare
                  key={slot}
                  href={pageHref(slot)}
                  isCurrent={slot === page.page}
                  label={`Страница ${slot}`}
                >
                  {slot}
                </PageSquare>
              ),
            )}
            <PageSquare
              href={page.page < page.pageCount ? pageHref(page.page + 1) : null}
              label="Вперёд"
            >
              →
            </PageSquare>
          </nav>
        ) : null}
        <NavigateSelect label="По" value={String(filters.pageSize)} options={sizeOptions} />
      </div>
    </div>
  )
}

function PageSquare({
  href,
  isCurrent = false,
  label,
  children,
}: {
  readonly href: string | null
  readonly isCurrent?: boolean
  readonly label: string
  readonly children: ReactNode
}) {
  if (!href) {
    return (
      <span aria-hidden="true" className={cn(squareClass, 'border-subtle text-faint')}>
        {children}
      </span>
    )
  }

  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={isCurrent ? 'page' : undefined}
      className={cn(
        squareClass,
        isCurrent
          ? 'border-ink bg-ink text-on-dark'
          : 'border-subtle bg-surface text-ink hover:border-faint',
      )}
    >
      {children}
    </Link>
  )
}
