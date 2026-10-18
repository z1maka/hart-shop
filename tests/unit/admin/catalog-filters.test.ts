import { describe, expect, it } from 'vitest'
import {
  CatalogSort,
  CatalogState,
  CatalogView,
  catalogHref,
  columnSort,
  pageWindow,
  parseCatalogFilters,
  SortableColumn,
} from '@/features/admin/model/catalog-filters'

const SIZES = [25, 50, 100]

describe('parseCatalogFilters', () => {
  it('reads every filter from the address', () => {
    expect(
      parseCatalogFilters(
        {
          q: '  пончо ',
          category: 'nakydky',
          state: 'draft',
          archive: '1',
          sort: 'price_desc',
          view: 'cards',
          page: '3',
          size: '50',
        },
        SIZES,
      ),
    ).toEqual({
      search: 'пончо',
      category: 'nakydky',
      state: CatalogState.Draft,
      isArchive: true,
      sort: CatalogSort.PriceDesc,
      view: CatalogView.Cards,
      page: 3,
      pageSize: 50,
    })
  })

  it('falls back to defaults for anything missing or unknown', () => {
    expect(
      parseCatalogFilters(
        { state: 'out_of_stock', sort: 'random', view: 'grid', page: '-2', size: '7' },
        SIZES,
      ),
    ).toEqual({
      search: '',
      category: null,
      state: null,
      isArchive: false,
      sort: CatalogSort.Category,
      view: CatalogView.Table,
      page: 1,
      pageSize: 25,
    })
  })

  it('ignores repeated parameters', () => {
    expect(parseCatalogFilters({ q: ['a', 'b'] }, SIZES).search).toBe('')
  })

  it('reads the status sort', () => {
    expect(parseCatalogFilters({ sort: 'status' }, SIZES).sort).toBe(CatalogSort.Status)
  })
})

describe('catalogHref', () => {
  const base = parseCatalogFilters({}, SIZES)

  it('leaves defaults out of the address', () => {
    expect(catalogHref(base, {}, 25)).toBe('/admin/catalog')
  })

  it('starts from page one whenever a filter changes', () => {
    const onPageThree = { ...base, page: 3, search: 'чохол' }
    expect(catalogHref(onPageThree, { category: 'starlink' }, 25)).toBe(
      '/admin/catalog?q=%D1%87%D0%BE%D1%85%D0%BE%D0%BB&category=starlink',
    )
  })

  it('keeps the filters when only the page moves', () => {
    const filtered = { ...base, state: CatalogState.Published, pageSize: 50 }
    expect(catalogHref(filtered, { page: 2 }, 25)).toBe(
      '/admin/catalog?state=published&size=50&page=2',
    )
  })

  it('keeps the card view in the address and leaves the table out', () => {
    const cards = { ...base, view: CatalogView.Cards }
    expect(catalogHref(cards, { sort: CatalogSort.Status }, 25)).toBe(
      '/admin/catalog?sort=status&view=cards',
    )
    expect(catalogHref(cards, { view: CatalogView.Table }, 25)).toBe('/admin/catalog')
  })

  it('clears a filter set to null', () => {
    expect(catalogHref({ ...base, category: 'starlink' }, { category: null }, 25)).toBe(
      '/admin/catalog',
    )
  })
})

describe('pageWindow', () => {
  it('shows every page when there are few', () => {
    expect(pageWindow(2, 3)).toEqual([1, 2, 3])
  })

  it('collapses the far pages into gaps', () => {
    expect(pageWindow(6, 12)).toEqual([1, 'gap', 5, 6, 7, 'gap', 12])
  })

  it('keeps the start contiguous near the first page', () => {
    expect(pageWindow(2, 10)).toEqual([1, 2, 3, 'gap', 10])
  })

  it('has a single page for a single page', () => {
    expect(pageWindow(1, 1)).toEqual([1])
  })
})

describe('the weight gap as a filter', () => {
  it('is a state the address can carry', () => {
    expect(parseCatalogFilters({ state: 'no_weight' }, [25]).state).toBe(CatalogState.NoWeight)
  })
})

describe('columnSort', () => {
  it('sorts by price cheaper first, then flips on the next click', () => {
    expect(columnSort(CatalogSort.Category, SortableColumn.Price)).toEqual({
      next: CatalogSort.PriceAsc,
      direction: null,
    })
    expect(columnSort(CatalogSort.PriceAsc, SortableColumn.Price)).toEqual({
      next: CatalogSort.PriceDesc,
      direction: 'asc',
    })
    expect(columnSort(CatalogSort.PriceDesc, SortableColumn.Price)).toEqual({
      next: CatalogSort.PriceAsc,
      direction: 'desc',
    })
  })

  it('sorts by position and status in their one order', () => {
    expect(columnSort(CatalogSort.Title, SortableColumn.Position)).toEqual({
      next: CatalogSort.Position,
      direction: null,
    })
    expect(columnSort(CatalogSort.Position, SortableColumn.Position).direction).toBe('asc')
    expect(columnSort(CatalogSort.Status, SortableColumn.Status)).toEqual({
      next: CatalogSort.Status,
      direction: 'asc',
    })
    expect(columnSort(CatalogSort.Status, SortableColumn.Price).direction).toBeNull()
  })
})
