import { requireAdminSession } from '@/features/admin/session-cookie'
import { adminStorefrontRepository } from '@/features/admin/repository/admin-storefront-repository'
import { FEATURED_LIMIT, type FeaturedMode } from '@/config/storefront'
import { storefrontAdminService } from '@/features/admin/services/storefront-admin'
import { publicUrl } from '@/lib/storage'
import { createMoney, Currency, formatMoney } from '@/lib/money'

export type FeaturedBoardItem = {
  readonly slug: string
  readonly title: string
  readonly categoryName: string
  readonly priceLabel: string
  readonly imageUrl: string | null
}

export type FeaturedBoard = {
  readonly items: readonly FeaturedBoardItem[]
  readonly mode: FeaturedMode
  readonly limit: number
}

const SEARCH_LIMIT = 8

export async function getFeaturedBoard(): Promise<FeaturedBoard> {
  await requireAdminSession()

  const [rows, mode] = await Promise.all([
    adminStorefrontRepository.findFeatured(),
    storefrontAdminService.readMode(),
  ])

  return { items: rows.map(toBoardItem), mode, limit: FEATURED_LIMIT }
}

export async function searchFeaturedCandidates(term: string): Promise<FeaturedBoardItem[]> {
  await requireAdminSession()

  const rows = await adminStorefrontRepository.searchCandidates(term, SEARCH_LIMIT)

  return rows.map(toBoardItem)
}

function toBoardItem(row: {
  slug: string
  title: string
  categoryName: string | null
  priceCents: number
  imageStorageKey: string | null
}): FeaturedBoardItem {
  return {
    slug: row.slug,
    title: row.title,
    categoryName: row.categoryName ?? '—',
    priceLabel: formatMoney(createMoney(row.priceCents, Currency.Uah)),
    imageUrl: row.imageStorageKey === null ? null : publicUrl(row.imageStorageKey),
  }
}
