import Link from 'next/link'
import type { ReactNode } from 'react'
import { ADMIN_PRODUCTS_PER_PAGE } from '@/config/admin'
import {
  catalogHref,
  CatalogState,
  type CatalogFilters,
} from '@/features/admin/model/catalog-filters'
import type { AdminCategoryRow } from '@/features/admin/queries/get-admin-catalog'
import type { CatalogFacetCounts } from '@/features/admin/repository/admin-catalog-repository'
import { cn } from '@/lib/utils'

const STATE_LABELS: Record<CatalogState, string> = {
  [CatalogState.Published]: 'Опубликованы',
  [CatalogState.Draft]: 'Черновики',
  [CatalogState.CategoryHidden]: 'Скрыты категорией',
  [CatalogState.NoWeight]: 'Без веса',
}

type CatalogSidebarProps = {
  readonly filters: CatalogFilters
  readonly facets: CatalogFacetCounts
  readonly categories: readonly AdminCategoryRow[]
}

export function CatalogSidebar({ filters, facets, categories }: CatalogSidebarProps) {
  const href = (change: Partial<CatalogFilters>) =>
    catalogHref(filters, change, ADMIN_PRODUCTS_PER_PAGE)
  const categoryCount = (category: AdminCategoryRow) =>
    filters.isArchive ? category.archived : category.published + category.drafts

  return (
    // minmax(0, 1fr): long category names truncate instead of widening the
    // column and pushing their counts under the list.
    <aside className="grid w-full shrink-0 grid-cols-[minmax(0,1fr)] gap-5 lg:w-60">
      <FilterGroup title="Категории">
        <FilterLink
          href={href({ category: null })}
          isActive={filters.category === null}
          label="Все категории"
          count={filters.isArchive ? facets.archived : facets.live}
        />
        {categories.map((category) => (
          <FilterLink
            key={category.slug}
            href={href({ category: category.slug })}
            isActive={filters.category === category.slug}
            label={category.name}
            count={categoryCount(category)}
          />
        ))}
      </FilterGroup>

      {filters.isArchive ? null : (
        <FilterGroup title="Состояние">
          <FilterLink
            href={href({ state: null })}
            isActive={filters.state === null}
            label="Любое"
            count={facets.live}
          />
          {Object.values(CatalogState).map((state) => (
            <FilterLink
              key={state}
              href={href({ state })}
              isActive={filters.state === state}
              label={STATE_LABELS[state]}
              count={facets.byState[state]}
            />
          ))}
        </FilterGroup>
      )}

      <ArchiveCard filters={filters} archived={facets.archived} />
    </aside>
  )
}

function ArchiveCard({
  filters,
  archived,
}: {
  readonly filters: CatalogFilters
  readonly archived: number
}) {
  const href = catalogHref(
    filters,
    { isArchive: !filters.isArchive, state: null },
    ADMIN_PRODUCTS_PER_PAGE,
  )

  return (
    <div className="rounded-card border border-subtle bg-surface p-4">
      <p className="mb-1 text-[13px] font-semibold text-ink">
        {filters.isArchive ? 'Вы в архиве' : 'Архив отдельно'}
      </p>
      <p className="mb-3 text-[12px] leading-relaxed text-muted">
        {filters.isArchive
          ? 'Снятые с публикации модели. Верните нужную кнопкой «Опубликовать».'
          : 'Снятые с производства модели не мешают ежедневной работе.'}
      </p>
      <Link
        href={href}
        scroll={false}
        className="inline-flex min-h-9 items-center rounded-pill border border-strong bg-surface px-3.5 text-[12.5px] font-semibold text-ink hover:border-faint"
      >
        {filters.isArchive ? '← К актуальным товарам' : `Открыть архив · ${archived}`}
      </Link>
    </div>
  )
}

function FilterGroup({
  title,
  children,
}: {
  readonly title: string
  readonly children: ReactNode
}) {
  return (
    <div>
      <p className="mb-2 px-3 text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">
        {title}
      </p>
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-0.5">{children}</ul>
    </div>
  )
}

function FilterLink({
  href,
  isActive,
  label,
  count,
}: {
  readonly href: string
  readonly isActive: boolean
  readonly label: string
  readonly count: number
}) {
  return (
    <li>
      <Link
        href={href}
        scroll={false}
        aria-current={isActive ? 'true' : undefined}
        className={cn(
          'flex min-h-9 items-center justify-between gap-3 rounded-control px-3 text-[13px] transition-colors',
          isActive ? 'bg-accent-soft font-semibold text-ink' : 'text-ink hover:bg-sunken',
        )}
      >
        <span className="min-w-0 truncate">{label}</span>
        <span className="shrink-0 text-[12px] text-muted">{count}</span>
      </Link>
    </li>
  )
}
