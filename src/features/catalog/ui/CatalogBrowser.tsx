import Link from 'next/link'
import type { ComponentProps } from 'react'
import { CUSTOM_ORDER_HREF } from '@/config/custom-order'
import {
  CATALOG_PAGE_SIZE,
  getCatalogPage,
  type CatalogPage,
} from '@/features/catalog/queries/get-products'
import { getCategoryCounts } from '@/features/catalog/queries/get-category-counts'
import { getColorFacets } from '@/features/catalog/queries/get-color-facets'
import type {
  CatalogSort,
  CatalogWeightBand,
} from '@/features/catalog/repository/product-repository'
import {
  CatalogSidebar,
  type CategoryFilterOption,
  type ColorFilterOption,
  type FilterOption,
} from '@/features/catalog/ui/CatalogSidebar'
import { MobileFilterToggle } from '@/features/catalog/ui/MobileFilterToggle'
import {
  catalogWindow,
  loadMoreStep,
  type CatalogWindow,
  type ListPosition,
} from '@/features/catalog/model/catalog-window'
import { CatalogLoadMore } from '@/features/catalog/ui/CatalogLoadMore'
import { CatalogPagination } from '@/features/catalog/ui/CatalogPagination'
import { CompareBar } from '@/features/catalog/ui/CompareBar'
import { ProductGrid } from '@/features/catalog/ui/ProductGrid'
import { SortSelect } from '@/features/catalog/ui/SortSelect'
import { getTranslations } from 'next-intl/server'
import { TrackEventOnce } from '@/features/analytics'
import { JsonLd } from '@/components/JsonLd'
import { itemListJsonLd } from '@/lib/seo'
import { cn } from '@/lib/utils'

const SORT_VALUES: readonly CatalogSort[] = [
  'recommended',
  'price-asc',
  'price-desc',
  'weight-asc',
]
const DEFAULT_SORT: CatalogSort = 'recommended'
const WEIGHT_BANDS: readonly CatalogWeightBand[] = ['light', 'heavy']

export type ShopSearchParams = Record<string, string | string[] | undefined>

type CatalogBrowserProps = {
  readonly categorySlug: string | null
  readonly categories: readonly { readonly slug: string; readonly name: string }[]
  readonly searchParams: Promise<ShopSearchParams>
}

export async function CatalogBrowser({
  categorySlug,
  categories,
  searchParams,
}: CatalogBrowserProps) {
  const [t, navT, colorsT, resolved] = await Promise.all([
    getTranslations('filters'),
    getTranslations('nav'),
    getTranslations('colors'),
    searchParams,
  ])
  const colors = parseColors(resolved.color)
  const weightBand = parseWeightBand(resolved.weight)
  const sort = parseSort(resolved.sort)
  const listWindow = catalogWindow(firstValue(resolved.page), firstValue(resolved.pages))

  const [catalog, colorFacets, categoryCounts] = await Promise.all([
    getCatalogPage({ categorySlug, colors, weightBand, sort, ...listWindow }),
    getColorFacets(),
    getCategoryCounts(),
  ])

  const basePath = categorySlug ? `/product-category/${categorySlug}/` : '/shop/'
  const totalCount = Object.values(categoryCounts).reduce((total, count) => total + count, 0)

  const categoryOptions: CategoryFilterOption[] = [
    {
      label: navT('allProducts'),
      count: totalCount,
      href: buildHref('/shop/', { colors, weightBand, sort }),
      isActive: !categorySlug,
    },
    ...categories.map((entry) => ({
      label: entry.name,
      count: categoryCounts[entry.slug] ?? 0,
      href: buildHref(`/product-category/${entry.slug}/`, { colors, weightBand, sort }),
      isActive: entry.slug === categorySlug,
    })),
  ]

  const colorOptions: ColorFilterOption[] = colorFacets.map((color) => ({
    name: color,
    label: color,
    isActive: colors.includes(color),
    href: buildHref(basePath, { colors: toggle(colors, color), weightBand, sort }),
  }))

  // The imported catalog carries no weights yet, so a weight filter would
  // only lie; the section stays hidden until the products state real weights.
  const weightOptions: FilterOption[] = []

  // The category is navigation, not a filter chip: counting it left "Clear"
  // unable to reach zero.
  const activeFilterCount = colors.length + (weightBand ? 1 : 0)
  const activeColorOptions = colorOptions.filter((option) => option.isActive)

  const listName = categorySlug ?? 'shop'
  const addedItems = catalog.items.slice((catalog.page - catalog.firstPage) * CATALOG_PAGE_SIZE)

  return (
    <div className="flex flex-col gap-6">
      <JsonLd
        data={itemListJsonLd(
          listName,
          catalog.items.map((item) => ({ name: item.title, path: `/product/${item.slug}/` })),
        )}
      />
      {/* Keyed by the last page shown: each «show more» reports the cards it
          added, never the ones already counted. */}
      <TrackEventOnce
        key={catalog.page}
        event={{
          name: 'view_item_list',
          listName,
          items: addedItems.map((item) => ({
            sku: item.sku,
            title: item.title,
            priceCents: item.price.amountCents,
            quantity: 1,
            categorySlug: item.categorySlug,
          })),
        }}
      />
      <div className="flex flex-wrap items-start gap-x-7 gap-y-3">
        <MobileFilterToggle
          showLabel={t('showFilters')}
          hideLabel={t('hideFilters')}
          activeFilterCount={activeFilterCount}
          trailing={<SortSelect value={sort} isCompact className="min-w-0 flex-1" />}
        >
          <CatalogSidebar
            categories={categoryOptions}
            colors={colorOptions}
            weightBands={weightOptions}
            clearHref={basePath}
            activeFilterCount={activeFilterCount}
          />
        </MobileFilterToggle>

        <div className="min-w-[min(100%,300px)] flex-[999_1_520px]">
          {/* On a phone the sort sits beside the filter toggle and the count
              goes, so this row is left only for the chips of chosen colours. */}
          <div
            className={cn(
              'mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-subtle pb-3.5',
              activeColorOptions.length === 0 && 'max-lg:hidden',
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] text-muted max-lg:hidden">
                {t('showingOf', { shown: catalog.items.length, total: catalog.total })}
              </span>
              {activeColorOptions.map((option) => (
                <ActiveFilterChip
                  key={option.href}
                  href={option.href}
                  label={colorsT.has(option.label) ? colorsT(option.label) : option.label}
                  removeLabel={t('removeFilter')}
                />
              ))}
            </div>
            <SortSelect value={sort} className="max-lg:hidden" />
          </div>

          {catalog.items.length > 0 ? (
            <ProductGrid products={catalog.items} priorityCount={3} highlightColors={colors} />
          ) : (
            <div className="rounded-card border border-subtle bg-surface p-10 text-center">
              <p className="text-[14.5px] text-muted">{t('empty')}</p>
              {/* The strongest moment on the whole site: someone has just
                  looked for a thing the catalogue does not have. */}
              <Link
                href={CUSTOM_ORDER_HREF}
                className="mt-3 inline-block text-[13.5px] font-bold text-accent hover:text-ink"
              >
                {t('emptyCustom')}
              </Link>
            </div>
          )}

          <div className="max-lg:hidden">
            <CatalogPagination
              page={catalog.page}
              pageCount={catalog.pageCount}
              hrefForPage={(nextPage) =>
                buildHref(basePath, { colors, weightBand, sort }, { page: nextPage })
              }
            />
          </div>
          <CatalogLoadMore
            {...loadMoreProps(listWindow, catalog, (position) =>
              buildHref(basePath, { colors, weightBand, sort }, position),
            )}
          />

          {catalog.items.length > 0 ? (
            <p className="pt-6 text-[13.5px]">
              <Link href={CUSTOM_ORDER_HREF} className="font-bold text-accent hover:text-ink">
                {t('notFoundCustom')}
              </Link>
            </p>
          ) : null}

          <CompareBar />
        </div>
      </div>
    </div>
  )
}

type HrefState = {
  readonly colors: readonly string[]
  readonly weightBand: CatalogWeightBand | null
  readonly sort: CatalogSort
}

function buildHref(path: string, state: HrefState, position: ListPosition = {}): string {
  const params = new URLSearchParams()

  if (state.colors.length > 0) params.set('color', state.colors.join(','))
  if (state.weightBand) params.set('weight', state.weightBand)
  if (state.sort !== DEFAULT_SORT) params.set('sort', state.sort)
  const page = position.page ?? 1
  if (page > 1) params.set('page', String(page))
  if (position.pages && position.pages > page) params.set('pages', String(position.pages))

  const query = params.toString()
  return query ? `${path}?${query}` : path
}

function toggle(colors: readonly string[], color: string): string[] {
  return colors.includes(color) ? colors.filter((entry) => entry !== color) : [...colors, color]
}

function firstValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function parseColors(value: string | string[] | undefined): string[] {
  const raw = firstValue(value)
  if (!raw) return []

  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
}

function parseWeightBand(value: string | string[] | undefined): CatalogWeightBand | null {
  const raw = firstValue(value)
  return WEIGHT_BANDS.find((band) => band === raw) ?? null
}

function parseSort(value: string | string[] | undefined): CatalogSort {
  const raw = firstValue(value)
  return SORT_VALUES.find((entry) => entry === raw) ?? DEFAULT_SORT
}

function loadMoreProps(
  listWindow: CatalogWindow,
  catalog: CatalogPage,
  hrefFor: (position: ListPosition) => string,
): ComponentProps<typeof CatalogLoadMore> {
  const step = loadMoreStep(
    listWindow,
    { shownCount: catalog.items.length, total: catalog.total, pageCount: catalog.pageCount },
    CATALOG_PAGE_SIZE,
  )

  return {
    shownFrom: step.shownFrom,
    shownTo: step.shownTo,
    total: catalog.total,
    pageCount: catalog.pageCount,
    nextHref: step.next ? hrefFor(step.next) : null,
    nextCount: step.nextCount,
  }
}

function ActiveFilterChip({
  href,
  label,
  removeLabel,
}: {
  readonly href: string
  readonly label: string
  readonly removeLabel: string
}) {
  return (
    <Link
      href={href}
      aria-label={`${removeLabel}: ${label}`}
      className="inline-flex min-h-[30px] items-center gap-1.5 rounded-chip bg-ink px-2.5 text-[12px] font-bold text-on-dark transition-colors hover:bg-ink-hover"
    >
      {label}
      <span aria-hidden>×</span>
    </Link>
  )
}
