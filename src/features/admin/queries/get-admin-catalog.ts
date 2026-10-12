import type { FaqEntry } from '@/features/catalog/model/category-content'
import { requireAdminSession } from '@/features/admin/session-cookie'
import type { CatalogFilters } from '@/features/admin/model/catalog-filters'
import {
  adminCatalogRepository,
  type CatalogFacetCounts,
} from '@/features/admin/repository/admin-catalog-repository'
import { categoryManagementService } from '@/features/catalog'
import { ProductStatus } from '@/db/enums'
import { gramsToKilosInput } from '@/features/admin/model/product-form'
import { createMoney, Currency, formatMoney } from '@/lib/money'
import { publicUrl } from '@/lib/storage'

export type AdminCategoryRow = {
  readonly id: string
  readonly slug: string
  readonly name: string
  readonly description: string | null
  readonly seoTitle: string | null
  readonly seoDescription: string | null
  readonly seoText: string | null
  readonly faq: readonly FaqEntry[]
  readonly googleProductCategory: number | null
  readonly isVisible: boolean
  readonly published: number
  readonly drafts: number
  readonly archived: number
}

export async function getAdminCategories(): Promise<AdminCategoryRow[]> {
  await requireAdminSession()

  const [categories, counts] = await Promise.all([
    categoryManagementService.listAll(),
    adminCatalogRepository.countProductsByCategory(),
  ])
  return categories.map((category) => ({
    ...category,
    published: counts[category.slug]?.published ?? 0,
    drafts: counts[category.slug]?.drafts ?? 0,
    archived: counts[category.slug]?.archived ?? 0,
  }))
}

export const AdminProductState = {
  Published: 'published',
  OutOfStock: 'out_of_stock',
  Draft: 'draft',
  CategoryHidden: 'category_hidden',
  Archived: 'archived',
} as const

export type AdminProductState = (typeof AdminProductState)[keyof typeof AdminProductState]

export type AdminProductRow = {
  readonly slug: string
  readonly title: string
  readonly sku: string
  readonly categoryName: string
  readonly variants: number
  readonly state: AdminProductState
  readonly isPublished: boolean
  // A product in a hidden category cannot be published on its own.
  readonly isCategoryHidden: boolean
  // What the buyer pays; with a sale, the regular price to strike through.
  readonly priceLabel: string
  readonly struckPriceLabel: string | null
  readonly stock: number
  // Empty until someone fills it; the carrier cannot price a parcel without.
  readonly weightKgInput: string
  readonly coverUrl: string | null
  readonly coverAlt: string
}

export type AdminProductPage = {
  readonly rows: AdminProductRow[]
  readonly page: number
  readonly pageCount: number
  readonly total: number
  // 1-based positions of the first and last row shown: "1–25 из 56".
  readonly from: number
  readonly to: number
}

export async function getAdminProducts(filters: CatalogFilters): Promise<AdminProductPage> {
  await requireAdminSession()

  const query = {
    search: filters.search,
    archived: filters.isArchive,
    categorySlug: filters.category,
    state: filters.state,
    sort: filters.sort,
  }
  const total = await adminCatalogRepository.countForAdmin(query)
  const pageCount = Math.max(1, Math.ceil(total / filters.pageSize))
  const page = Math.min(filters.page, pageCount)
  const offset = (page - 1) * filters.pageSize
  const rows = await adminCatalogRepository.findForAdmin({
    ...query,
    limit: filters.pageSize,
    offset,
  })

  return {
    rows: rows.map(toProductRow),
    page,
    pageCount,
    total,
    from: total === 0 ? 0 : offset + 1,
    to: offset + rows.length,
  }
}

export async function getCatalogFacets(): Promise<CatalogFacetCounts> {
  await requireAdminSession()
  return adminCatalogRepository.countFacets()
}

type ProductListRow = Awaited<ReturnType<typeof adminCatalogRepository.findForAdmin>>[number]

function toProductRow(row: ProductListRow): AdminProductRow {
  const hasSale = row.salePriceCents !== null && row.salePriceCents < row.priceCents
  return {
    slug: row.slug,
    title: row.title,
    sku: row.sku,
    categoryName: row.categoryName,
    variants: row.variants,
    state: resolveState(row),
    isPublished: row.status === ProductStatus.Published,
    isCategoryHidden: !row.categoryVisible,
    priceLabel: hryvnias(
      hasSale && row.salePriceCents !== null ? row.salePriceCents : row.priceCents,
    ),
    struckPriceLabel: hasSale ? hryvnias(row.priceCents) : null,
    stock: row.stock,
    weightKgInput: gramsToKilosInput(row.weightGrams),
    coverUrl: row.cover ? publicUrl(row.cover.storageKey) : null,
    coverAlt: row.cover?.alt ?? row.title,
  }
}

function hryvnias(cents: number): string {
  return formatMoney(createMoney(cents, Currency.Uah))
}

function resolveState(row: {
  status: string
  categoryVisible: boolean
  stock: number
}): AdminProductState {
  if (row.status === ProductStatus.Archived) return AdminProductState.Archived
  if (!row.categoryVisible) return AdminProductState.CategoryHidden
  if (row.status !== ProductStatus.Published) return AdminProductState.Draft
  if (row.stock === 0) return AdminProductState.OutOfStock

  return AdminProductState.Published
}
