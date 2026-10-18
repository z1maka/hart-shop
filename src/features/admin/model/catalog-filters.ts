// The product list is driven entirely by its address, so a filtered view can
// be bookmarked, refreshed and shared, and the server renders it directly.

// What the sidebar filters by among live (non-archived) products. Out of
// stock is left out on purpose: the owner keeps everything in stock.
export const CatalogState = {
  Published: 'published',
  Draft: 'draft',
  CategoryHidden: 'hidden',
  // Not a publication state but the gap that stops a waybill: the carrier
  // needs the parcel's weight.
  NoWeight: 'no_weight',
} as const

export type CatalogState = (typeof CatalogState)[keyof typeof CatalogState]

export const CatalogSort = {
  Category: 'category',
  Title: 'title',
  PriceAsc: 'price_asc',
  PriceDesc: 'price_desc',
  Updated: 'updated',
  // The order of «Рекомендовані» in the shop.
  Position: 'position',
  // Live first, then what buyers cannot see: the order of the state badges.
  Status: 'status',
} as const

export type CatalogSort = (typeof CatalogSort)[keyof typeof CatalogSort]

// The table edits weight and position in place; the cards show the photos
// the way the shop does.
export const CatalogView = {
  Table: 'table',
  Cards: 'cards',
} as const

export type CatalogView = (typeof CatalogView)[keyof typeof CatalogView]

export type CatalogFilters = {
  readonly search: string
  readonly category: string | null
  readonly state: CatalogState | null
  readonly isArchive: boolean
  readonly sort: CatalogSort
  readonly view: CatalogView
  readonly page: number
  readonly pageSize: number
}

export const SortableColumn = {
  Price: 'price',
  Position: 'position',
  Status: 'status',
} as const

export type SortableColumn = (typeof SortableColumn)[keyof typeof SortableColumn]

export type ColumnSort = {
  // The sort a click on the header asks for.
  readonly next: CatalogSort
  // How the list is sorted by this column now; null when it is not.
  readonly direction: 'asc' | 'desc' | null
}

// A header click sorts by its column; the price header flips between cheaper
// and dearer first, position and status have one natural order.
export function columnSort(current: CatalogSort, column: SortableColumn): ColumnSort {
  if (column === SortableColumn.Price) {
    if (current === CatalogSort.PriceAsc) return { next: CatalogSort.PriceDesc, direction: 'asc' }
    if (current === CatalogSort.PriceDesc) return { next: CatalogSort.PriceAsc, direction: 'desc' }
    return { next: CatalogSort.PriceAsc, direction: null }
  }

  const sort = column === SortableColumn.Position ? CatalogSort.Position : CatalogSort.Status
  return { next: sort, direction: current === sort ? 'asc' : null }
}

type SearchParams = Readonly<Record<string, string | string[] | undefined>>

const SEARCH_MAX_LENGTH = 120
const CATEGORY_MAX_LENGTH = 160

function single(value: string | string[] | undefined): string {
  return typeof value === 'string' ? value : ''
}

function oneOf<T extends string>(value: string, allowed: Readonly<Record<string, T>>): T | null {
  return (Object.values(allowed) as string[]).includes(value) ? (value as T) : null
}

export function parseCatalogFilters(
  params: SearchParams,
  pageSizes: readonly number[],
): CatalogFilters {
  const page = Number(single(params.page))
  const pageSize = Number(single(params.size))
  const [defaultSize = pageSizes[0] ?? 1] = pageSizes

  return {
    search: single(params.q).trim().slice(0, SEARCH_MAX_LENGTH),
    category: single(params.category).slice(0, CATEGORY_MAX_LENGTH) || null,
    state: oneOf(single(params.state), CatalogState),
    isArchive: single(params.archive) === '1',
    sort: oneOf(single(params.sort), CatalogSort) ?? CatalogSort.Category,
    view: oneOf(single(params.view), CatalogView) ?? CatalogView.Table,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    pageSize: pageSizes.includes(pageSize) ? pageSize : defaultSize,
  }
}

// A link to the same list with some filters changed. Any change other than
// the page itself starts again from page one; defaults are left out so the
// address stays short.
export function catalogHref(
  filters: CatalogFilters,
  change: Partial<CatalogFilters>,
  defaultPageSize: number,
): string {
  const next = { ...filters, page: 1, ...change }
  const params = new URLSearchParams()
  if (next.search) params.set('q', next.search)
  if (next.category) params.set('category', next.category)
  if (next.state) params.set('state', next.state)
  if (next.isArchive) params.set('archive', '1')
  if (next.sort !== CatalogSort.Category) params.set('sort', next.sort)
  if (next.view !== CatalogView.Table) params.set('view', next.view)
  if (next.pageSize !== defaultPageSize) params.set('size', String(next.pageSize))
  if (next.page > 1) params.set('page', String(next.page))

  const query = params.toString()
  return query ? `/admin/catalog?${query}` : '/admin/catalog'
}

export type PageSlot = number | 'gap'

const EDGE_PAGES = 1
const PAGES_AROUND = 1

// Page numbers to show: the first and last, the current with a neighbour on
// each side, and a gap wherever pages are skipped — "1 … 4 5 6 … 12".
export function pageWindow(page: number, pageCount: number): PageSlot[] {
  const shown = Array.from({ length: pageCount }, (_, index) => index + 1).filter(
    (candidate) =>
      candidate <= EDGE_PAGES ||
      candidate > pageCount - EDGE_PAGES ||
      Math.abs(candidate - page) <= PAGES_AROUND,
  )

  return shown.flatMap((candidate, index): PageSlot[] => {
    const previous = shown[index - 1]
    return previous !== undefined && candidate - previous > 1 ? ['gap', candidate] : [candidate]
  })
}
