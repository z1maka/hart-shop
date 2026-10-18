import Link from 'next/link'
import { ADMIN_PRODUCT_PAGE_SIZES, ADMIN_PRODUCTS_PER_PAGE } from '@/config/admin'
import {
  catalogHref,
  CatalogView,
  columnSort,
  parseCatalogFilters,
  SortableColumn,
  type CatalogFilters,
} from '@/features/admin/model/catalog-filters'
import {
  getAdminCategories,
  getAdminProducts,
  getCatalogFacets,
  type AdminProductPage,
} from '@/features/admin/queries/get-admin-catalog'
import { CatalogPagination, PRODUCT_LIST_ANCHOR } from '@/features/admin/ui/CatalogPagination'
import { CatalogSidebar } from '@/features/admin/ui/CatalogSidebar'
import { CatalogTab, CatalogTabs } from '@/features/admin/ui/CatalogTabs'
import { ProductCardGrid } from '@/features/admin/ui/ProductCardGrid'
import { ProductList, type SortHeaders } from '@/features/admin/ui/ProductList'
import { ProductListToolbar } from '@/features/admin/ui/ProductListToolbar'
import { RefreshStorefront } from '@/features/admin/ui/RefreshStorefront'
import { Button } from '@/components/ui/Button'

type ProductsCatalogProps = {
  readonly searchParams: PageProps<'/admin/catalog'>['searchParams']
}

// The products tab: filters on the left, the list on the right, all of it
// read from the address.
export async function ProductsCatalog({ searchParams }: ProductsCatalogProps) {
  const filters = parseCatalogFilters(await searchParams, ADMIN_PRODUCT_PAGE_SIZES)
  const [page, facets, categories] = await Promise.all([
    getAdminProducts(filters),
    getCatalogFacets(),
    getAdminCategories(),
  ])

  return (
    <>
      <CatalogTabs
        active={CatalogTab.Products}
        productCount={facets.live}
        categoryCount={categories.length}
        actions={
          <>
            <RefreshStorefront />
            <Button asChild size="sm">
              <Link href="/admin/catalog/new">+ Добавить товар</Link>
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-start gap-6">
        <CatalogSidebar filters={filters} facets={facets} categories={categories} />

        <section id={PRODUCT_LIST_ANCHOR} className="min-w-0 flex-[999_1_560px]">
          <ProductListToolbar filters={filters} />
          <CatalogRows filters={filters} page={page} />
          <CatalogPagination filters={filters} page={page} />
          <p className="mt-3.5 max-w-[80ch] text-[12.5px] leading-relaxed text-muted">
            Нулевой остаток и снятие с публикации — разное. Товар без остатка остаётся в каталоге с
            подпиской на поступление, снятый с публикации исчезает с сайта и уходит в архив.
          </p>
        </section>
      </div>
    </>
  )
}

type CatalogRowsProps = {
  readonly filters: CatalogFilters
  readonly page: AdminProductPage
}

function CatalogRows({ filters, page }: CatalogRowsProps) {
  if (page.rows.length === 0) {
    return (
      <p className="mb-3.5 rounded-card border border-subtle bg-surface p-5 text-[13.5px] text-muted">
        {filters.search
          ? `Ничего не найдено по запросу «${filters.search}». Поиск идёт по названию, артикулу и SKU вариантов.`
          : 'В этом разделе пока нет товаров.'}
      </p>
    )
  }

  if (filters.view === CatalogView.Cards) return <ProductCardGrid rows={page.rows} />

  return (
    <ProductList
      // Any other set of rows — a page, a filter, a sort, a page size —
      // starts with nothing ticked, so the bar never acts on rows the
      // admin no longer sees.
      key={catalogHref(filters, { page: page.page }, ADMIN_PRODUCTS_PER_PAGE)}
      rows={page.rows}
      isArchive={filters.isArchive}
      sortHeaders={sortHeadersFor(filters)}
    />
  )
}

function sortHeadersFor(filters: CatalogFilters): SortHeaders {
  const header = (column: SortableColumn) => {
    const sort = columnSort(filters.sort, column)
    return { ...sort, href: catalogHref(filters, { sort: sort.next }, ADMIN_PRODUCTS_PER_PAGE) }
  }

  return {
    [SortableColumn.Price]: header(SortableColumn.Price),
    [SortableColumn.Position]: header(SortableColumn.Position),
    [SortableColumn.Status]: header(SortableColumn.Status),
  }
}
