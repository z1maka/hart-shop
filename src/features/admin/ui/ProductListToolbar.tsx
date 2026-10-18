import { ADMIN_PRODUCTS_PER_PAGE } from '@/config/admin'
import Link from 'next/link'
import {
  catalogHref,
  CatalogSort,
  CatalogView,
  type CatalogFilters,
} from '@/features/admin/model/catalog-filters'
import { NavigateSelect } from '@/features/admin/ui/NavigateSelect'
import { SlashFocus } from '@/features/admin/ui/SlashFocus'

const SEARCH_INPUT_ID = 'catalog-search'

const SORT_LABELS: Record<CatalogSort, string> = {
  [CatalogSort.Category]: 'по категории',
  [CatalogSort.Title]: 'по названию',
  [CatalogSort.PriceAsc]: 'сначала дешевле',
  [CatalogSort.PriceDesc]: 'сначала дороже',
  [CatalogSort.Updated]: 'недавно изменённые',
  [CatalogSort.Position]: 'по позиции в каталоге',
  [CatalogSort.Status]: 'по статусу',
}

const VIEW_LABELS: Record<CatalogView, string> = {
  [CatalogView.Table]: 'Таблица',
  [CatalogView.Cards]: 'Карточки',
}

export function ProductListToolbar({ filters }: { readonly filters: CatalogFilters }) {
  const sortOptions = Object.values(CatalogSort).map((sort) => ({
    value: sort,
    label: SORT_LABELS[sort],
    href: catalogHref(filters, { sort }, ADMIN_PRODUCTS_PER_PAGE),
  }))

  return (
    <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
      {/* A plain GET form: the search is part of the address like every filter. */}
      <form action="/admin/catalog" className="relative min-w-[min(100%,280px)] flex-1">
        <KeptFilters filters={filters} />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[14px] text-muted"
        >
          ⌕
        </span>
        <input
          id={SEARCH_INPUT_ID}
          name="q"
          type="search"
          defaultValue={filters.search}
          placeholder="Название, артикул или SKU варианта"
          className="min-h-11 w-full rounded-control border-[1.5px] border-strong bg-raised pr-11 pl-9 text-[13.5px] text-ink placeholder:text-faint focus-visible:border-accent"
        />
        <kbd className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded-[5px] border border-subtle bg-sunken px-1.5 text-[11px] text-muted">
          /
        </kbd>
      </form>
      <SlashFocus targetId={SEARCH_INPUT_ID} />
      <NavigateSelect label="Сортировка:" value={filters.sort} options={sortOptions} />
      <ViewSwitch filters={filters} />
    </div>
  )
}

function ViewSwitch({ filters }: { readonly filters: CatalogFilters }) {
  return (
    <nav
      aria-label="Вид списка"
      className="flex rounded-control border-[1.5px] border-strong bg-raised p-0.5"
    >
      {Object.values(CatalogView).map((view) => {
        const isActive = filters.view === view
        return (
          <Link
            key={view}
            href={catalogHref(filters, { view, page: filters.page }, ADMIN_PRODUCTS_PER_PAGE)}
            scroll={false}
            aria-current={isActive ? 'page' : undefined}
            className={
              isActive
                ? 'rounded-[7px] bg-ink px-3.5 py-2 text-[12.5px] font-semibold text-on-dark'
                : 'rounded-[7px] px-3.5 py-2 text-[12.5px] font-semibold text-muted hover:text-ink'
            }
          >
            {VIEW_LABELS[view]}
          </Link>
        )
      })}
    </nav>
  )
}

// A new search keeps the category, state, archive, sort, view and page size the
// admin is looking at; only the page starts again.
function KeptFilters({ filters }: { readonly filters: CatalogFilters }) {
  const kept = Object.entries({
    category: filters.category,
    state: filters.state,
    archive: filters.isArchive ? '1' : null,
    sort: filters.sort === CatalogSort.Category ? null : filters.sort,
    view: filters.view === CatalogView.Table ? null : filters.view,
    size: filters.pageSize === ADMIN_PRODUCTS_PER_PAGE ? null : String(filters.pageSize),
  }).filter((entry): entry is [string, string] => entry[1] !== null)

  return kept.map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)
}
