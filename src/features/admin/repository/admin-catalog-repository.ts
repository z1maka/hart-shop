import {
  and,
  asc,
  count,
  countDistinct,
  desc,
  eq,
  exists,
  ilike,
  inArray,
  ne,
  or,
  sql,
  type SQL,
} from 'drizzle-orm'
import { categories, productImages, productVariants, products } from '@/db/schema'
import { ProductStatus } from '@/db/enums'
import {
  CatalogSort,
  CatalogState,
  type CatalogSort as CatalogSortKey,
  type CatalogState as CatalogStateKey,
} from '@/features/admin/model/catalog-filters'
import type { ProductSpec, VariantOptions } from '@/db/schema'

export type ProductSpecRow = ProductSpec
import { db } from '@/lib/db'
import { escapeLikePattern } from '@/lib/sql'

export type ProductDraftRow = {
  readonly shortTitle: string | null
  readonly seoTitle: string | null
  readonly id: string
  readonly slug: string
  readonly sku: string
  readonly title: string
  readonly description: string
  readonly categoryId: string | null
  readonly googleProductCategory: number | null
  readonly priceCents: number
  readonly salePriceCents: number | null
  readonly wholesaleMinQty: number | null
  readonly wholesalePriceCents: number | null
  readonly weightGrams: number
  readonly layers: number
  readonly summary: string | null
  readonly seoDescription: string | null
  readonly status: string
  readonly specs: readonly ProductSpec[]
  readonly included: readonly string[]
  readonly careNotes: readonly string[]
  readonly updatedAt: Date
}

export type ProductVariantRow = {
  readonly id: string
  readonly sku: string
  readonly options: VariantOptions
  readonly stockQty: number
  readonly coverImageId: string | null
}

export type ProductImageRow = {
  readonly id: string
  readonly storageKey: string
  readonly squareStorageKey: string | null
  readonly alt: string
  readonly position: number
}

export type ProductImageInsert = {
  readonly productId: string
  readonly storageKey: string
  readonly squareStorageKey: string
  readonly alt: string
  readonly position: number
  readonly width: number
  readonly height: number
}

export type ProductCreateInput = {
  readonly slug: string
  readonly sku: string
  readonly title: string
  readonly description: string
  readonly categoryId: string
  readonly priceCents: number
  readonly weightGrams: number
  readonly variantColor: string
}

export type ProductUpdateInput = {
  readonly shortTitle: string | null
  readonly seoTitle: string | null
  readonly seoDescription: string | null
  readonly slug: string
  readonly sku: string
  readonly title: string
  readonly description: string
  readonly categoryId: string
  // Undefined leaves the stored value alone: a form rendered before this
  // field existed must not wipe it.
  readonly googleProductCategory?: number | null
  readonly priceCents: number
  readonly salePriceCents: number | null
  readonly wholesaleMinQty: number | null
  readonly wholesalePriceCents: number | null
  readonly weightGrams: number
  readonly layers: number
  readonly summary: string | null
  readonly specs: readonly ProductSpec[]
  readonly stockByVariantId: Readonly<Record<string, number>>
  // The gallery photo (by storage key) chosen for each variant; null clears it.
  readonly coverByVariantId: Readonly<Record<string, string | null>>
}

export type CategoryCounts = Record<string, { published: number; drafts: number; archived: number }>

export type AdminProductQuery = {
  readonly search: string
  readonly archived: boolean
  readonly categorySlug: string | null
  readonly state: CatalogStateKey | null
  readonly sort: CatalogSortKey
}

export type AdminProductPageQuery = AdminProductQuery & {
  readonly limit: number
  readonly offset: number
}

// Live products per state and the archive's size — the numbers beside the
// state filters; per-category numbers come with the categories themselves.
export type CatalogFacetCounts = {
  readonly live: number
  readonly archived: number
  readonly byState: Readonly<Record<CatalogStateKey, number>>
}

export const adminCatalogRepository = {
  async countProductsByCategory(): Promise<CategoryCounts> {
    const rows = await db
      .select({
        slug: categories.slug,
        published: sql<number>`count(*) filter (where ${products.status} = ${ProductStatus.Published})::int`,
        drafts: sql<number>`count(*) filter (where ${products.status} = ${ProductStatus.Draft})::int`,
        archived: sql<number>`count(*) filter (where ${products.status} = ${ProductStatus.Archived})::int`,
      })
      .from(categories)
      .leftJoin(products, eq(products.categoryId, categories.id))
      .groupBy(categories.slug)

    return Object.fromEntries(
      rows.map((row) => [
        row.slug,
        { published: row.published, drafts: row.drafts, archived: row.archived },
      ]),
    )
  },

  async countFacets(): Promise<CatalogFacetCounts> {
    const isLive = ne(products.status, ProductStatus.Archived)
    const [totals] = await db
      .select({
        live: sql<number>`count(*) filter (where ${isLive})::int`,
        archived: sql<number>`count(*) filter (where ${products.status} = ${ProductStatus.Archived})::int`,
        published: sql<number>`count(*) filter (where ${stateCondition(CatalogState.Published)})::int`,
        draft: sql<number>`count(*) filter (where ${stateCondition(CatalogState.Draft)})::int`,
        hidden: sql<number>`count(*) filter (where ${isLive} and ${stateCondition(CatalogState.CategoryHidden)})::int`,
        noWeight: sql<number>`count(*) filter (where ${isLive} and ${stateCondition(CatalogState.NoWeight)})::int`,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))

    return {
      live: totals?.live ?? 0,
      archived: totals?.archived ?? 0,
      byState: {
        [CatalogState.Published]: totals?.published ?? 0,
        [CatalogState.Draft]: totals?.draft ?? 0,
        [CatalogState.CategoryHidden]: totals?.hidden ?? 0,
        [CatalogState.NoWeight]: totals?.noWeight ?? 0,
      },
    }
  },

  async findForAdmin(query: AdminProductPageQuery) {
    const rows = await db
      .select({
        id: products.id,
        slug: products.slug,
        title: products.title,
        sku: products.sku,
        status: products.status,
        priceCents: products.priceCents,
        salePriceCents: products.salePriceCents,
        weightGrams: products.weightGrams,
        categoryName: categories.name,
        categoryVisible: categories.isVisible,
        stock: sql<number>`coalesce(sum(${productVariants.stockQty}), 0)::int`,
        variants: countDistinct(productVariants.id),
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(productVariants, eq(productVariants.productId, products.id))
      .where(buildAdminFilter(query))
      .groupBy(products.id, categories.id)
      .orderBy(...adminOrder(query.sort))
      .limit(query.limit)
      .offset(query.offset)

    const covers = await findCovers(rows.map((row) => row.id))

    return rows.map((row) => ({
      slug: row.slug,
      title: row.title,
      sku: row.sku,
      categoryName: row.categoryName,
      categoryVisible: row.categoryVisible,
      status: row.status,
      priceCents: row.priceCents,
      salePriceCents: row.salePriceCents,
      weightGrams: row.weightGrams,
      stock: row.stock,
      variants: row.variants,
      cover: covers.get(row.id) ?? null,
    }))
  },

  async countForAdmin(query: AdminProductQuery): Promise<number> {
    const [row] = await db
      .select({ total: count() })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(buildAdminFilter(query))

    return row?.total ?? 0
  },
}

// The working list and the archive never mix: day-to-day the admin manages
// live products, and the archive keeps retired ones reachable on demand.
function buildAdminFilter(query: AdminProductQuery): SQL | undefined {
  return and(
    query.archived
      ? eq(products.status, ProductStatus.Archived)
      : ne(products.status, ProductStatus.Archived),
    query.categorySlug ? eq(categories.slug, query.categorySlug) : undefined,
    query.state && !query.archived ? stateCondition(query.state) : undefined,
    query.search ? searchCondition(query.search) : undefined,
  )
}

// A hidden category takes its products off the shop whatever their own
// status, so "hidden" wins over published and draft.
function stateCondition(state: CatalogStateKey): SQL | undefined {
  switch (state) {
    case CatalogState.Published:
      return and(eq(products.status, ProductStatus.Published), eq(categories.isVisible, true))
    case CatalogState.Draft:
      return and(eq(products.status, ProductStatus.Draft), eq(categories.isVisible, true))
    case CatalogState.CategoryHidden:
      return eq(categories.isVisible, false)
    case CatalogState.NoWeight:
      return eq(products.weightGrams, 0)
  }
}

// Title, product SKU, or the SKU of any of its variants — the code printed
// on the label the packer is holding.
function searchCondition(search: string): SQL | undefined {
  const pattern = `%${escapeLikePattern(search)}%`
  const variantMatch = db
    .select({ id: productVariants.id })
    .from(productVariants)
    .where(and(eq(productVariants.productId, products.id), ilike(productVariants.sku, pattern)))

  return or(ilike(products.title, pattern), ilike(products.sku, pattern), exists(variantMatch))
}

// The id closes every order: rows that tie — a bulk change stamps one time
// on a hundred products, colours share a title — would otherwise come back
// in any order, and a page boundary would repeat some and skip others.
function adminOrder(sort: CatalogSortKey): SQL[] {
  return [...sortKeys(sort), asc(products.id)]
}

// What the buyer pays: the list shows the sale price, so it sorts by it too.
const buyerPrice = sql`coalesce(${products.salePriceCents}, ${products.priceCents})`

function sortKeys(sort: CatalogSortKey): SQL[] {
  switch (sort) {
    case CatalogSort.Title:
      return [asc(products.title)]
    case CatalogSort.PriceAsc:
      return [asc(buyerPrice), asc(products.title)]
    case CatalogSort.PriceDesc:
      return [desc(buyerPrice), asc(products.title)]
    case CatalogSort.Updated:
      return [desc(products.updatedAt)]
    case CatalogSort.Category:
      return [asc(categories.position), asc(products.title)]
  }
}

export const adminProductRepository = {
  async findDraft(slug: string): Promise<{
    product: ProductDraftRow
    variants: ProductVariantRow[]
    images: ProductImageRow[]
  } | null> {
    const [product] = await db
      .select({
        id: products.id,
        slug: products.slug,
        sku: products.sku,
        title: products.title,
        shortTitle: products.shortTitle,
        description: products.description,
        categoryId: products.categoryId,
        googleProductCategory: products.googleProductCategory,
        priceCents: products.priceCents,
        salePriceCents: products.salePriceCents,
        wholesaleMinQty: products.wholesaleMinQty,
        wholesalePriceCents: products.wholesalePriceCents,
        weightGrams: products.weightGrams,
        layers: products.layers,
        summary: products.summary,
        seoTitle: products.seoTitle,
        seoDescription: products.seoDescription,
        status: products.status,
        specs: products.specs,
        included: products.included,
        careNotes: products.careNotes,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .where(eq(products.slug, slug))
      .limit(1)

    if (!product) return null

    const [variants, images] = await Promise.all([
      db
        .select({
          id: productVariants.id,
          sku: productVariants.sku,
          options: productVariants.options,
          stockQty: productVariants.stockQty,
          coverImageId: productVariants.coverImageId,
        })
        .from(productVariants)
        .where(eq(productVariants.productId, product.id))
        .orderBy(asc(productVariants.position)),
      db
        .select({
          id: productImages.id,
          storageKey: productImages.storageKey,
          squareStorageKey: productImages.squareStorageKey,
          alt: productImages.alt,
          position: productImages.position,
        })
        .from(productImages)
        .where(eq(productImages.productId, product.id))
        .orderBy(asc(productImages.position)),
    ])

    return { product, variants, images }
  },

  async listCategories(): Promise<
    {
      id: string
      slug: string
      name: string
      isVisible: boolean
      googleProductCategory: number | null
    }[]
  > {
    return db
      .select({
        id: categories.id,
        slug: categories.slug,
        name: categories.name,
        isVisible: categories.isVisible,
        googleProductCategory: categories.googleProductCategory,
      })
      .from(categories)
      .orderBy(asc(categories.position))
  },

  // A product with no variant cannot be added to a cart, so the first one is
  // created alongside it.
  async createDraft(input: ProductCreateInput): Promise<string> {
    return db.transaction(async (tx) => {
      const [product] = await tx
        .insert(products)
        .values({
          slug: input.slug,
          sku: input.sku,
          title: input.title,
          description: input.description,
          categoryId: input.categoryId,
          priceCents: input.priceCents,
          weightGrams: input.weightGrams,
          status: ProductStatus.Draft,
        })
        .returning({ id: products.id })

      if (!product) throw new Error(`Product "${input.slug}" could not be created`)

      await tx.insert(productVariants).values({
        productId: product.id,
        sku: `${input.sku}-${input.variantColor.toUpperCase()}`,
        options: { Color: input.variantColor },
        stockQty: 0,
      })

      return product.id
    })
  },

  async addImage(input: ProductImageInsert): Promise<void> {
    await db.insert(productImages).values(input)
  },

  async nextImagePosition(productId: string): Promise<number> {
    const [row] = await db
      .select({ next: sql<number>`coalesce(max(${productImages.position}), -1) + 1` })
      .from(productImages)
      .where(eq(productImages.productId, productId))

    return row?.next ?? 0
  },

  async findImage(
    productId: string,
    storageKey: string,
  ): Promise<{ storageKey: string; squareStorageKey: string | null } | null> {
    const [row] = await db
      .select({
        storageKey: productImages.storageKey,
        squareStorageKey: productImages.squareStorageKey,
      })
      .from(productImages)
      .where(and(eq(productImages.productId, productId), eq(productImages.storageKey, storageKey)))
      .limit(1)

    return row ?? null
  },

  async deleteImage(productId: string, storageKey: string): Promise<void> {
    await db.transaction(async (tx) => {
      await tx
        .delete(productImages)
        .where(
          and(eq(productImages.productId, productId), eq(productImages.storageKey, storageKey)),
        )

      const remaining = await orderedKeys(tx, productId)
      await renumber(tx, productId, remaining)
    })
  },

  // Positions are rewritten as a block so the chosen shot leads and the rest
  // keep their order behind it — the first row is what the catalogue shows.
  async promoteImage(productId: string, storageKey: string): Promise<void> {
    await db.transaction(async (tx) => {
      const keys = await orderedKeys(tx, productId)
      await renumber(tx, productId, [storageKey, ...keys.filter((key) => key !== storageKey)])
    })
  },

  async moveImage(productId: string, storageKey: string, offset: -1 | 1): Promise<boolean> {
    return db.transaction(async (tx) => {
      const keys = [...(await orderedKeys(tx, productId))]
      const index = keys.indexOf(storageKey)
      const target = index + offset

      if (index === -1 || target < 0 || target >= keys.length) return false

      const other = keys[target]
      const current = keys[index]
      if (other === undefined || current === undefined) return false

      keys[target] = current
      keys[index] = other
      await renumber(tx, productId, keys)
      return true
    })
  },

  async findBySku(sku: string): Promise<{ slug: string } | null> {
    const [row] = await db
      .select({ slug: products.slug })
      .from(products)
      .where(eq(products.sku, sku))
      .limit(1)

    return row ?? null
  },

  // Several at once from the list's bulk bar; answers how many changed.
  async setStatusMany(slugs: readonly string[], status: ProductStatus): Promise<number> {
    if (slugs.length === 0) return 0

    const changed = await db
      .update(products)
      .set({ status, archivedByCategory: false, updatedAt: new Date() })
      .where(inArray(products.slug, [...slugs]))
      .returning({ id: products.id })

    return changed.length
  },

  // Filled straight in the list: the carrier needs a weight on every product
  // before a waybill can be issued.
  async setWeight(slug: string, weightGrams: number): Promise<boolean> {
    const changed = await db
      .update(products)
      .set({ weightGrams, updatedAt: new Date() })
      .where(eq(products.slug, slug))
      .returning({ id: products.id })

    return changed.length > 0
  },

  async setStatus(slug: string, status: ProductStatus): Promise<boolean> {
    const changed = await db
      .update(products)
      // A manual status change overrides whatever the category did: the flag
      // resets so a later category re-publish honours this decision.
      .set({ status, archivedByCategory: false, updatedAt: new Date() })
      .where(eq(products.slug, slug))
      .returning({ id: products.id })

    return changed.length > 0
  },

  // Product row and variant stock move together: a price change that lands
  // while stock does not would misprice whatever is reserved right now.
  async update(productId: string, input: ProductUpdateInput): Promise<void> {
    await db.transaction(async (tx) => {
      await tx
        .update(products)
        .set({
          slug: input.slug,
          sku: input.sku,
          title: input.title,
          shortTitle: input.shortTitle,
          seoTitle: input.seoTitle,
          seoDescription: input.seoDescription,
          description: input.description,
          categoryId: input.categoryId,
          ...(input.googleProductCategory === undefined
            ? {}
            : { googleProductCategory: input.googleProductCategory }),
          priceCents: input.priceCents,
          salePriceCents: input.salePriceCents,
          wholesaleMinQty: input.wholesaleMinQty,
          wholesalePriceCents: input.wholesalePriceCents,
          weightGrams: input.weightGrams,
          layers: input.layers,
          summary: input.summary,
          specs: input.specs,
          updatedAt: new Date(),
        })
        .where(eq(products.id, productId))

      for (const [variantId, stockQty] of Object.entries(input.stockByVariantId)) {
        const coverKey = input.coverByVariantId[variantId] ?? null
        await tx
          .update(productVariants)
          .set({
            stockQty,
            // One of this product's own photos, or nothing when the key is
            // gone from the gallery: a cover never points at another product.
            coverImageId:
              coverKey === null
                ? null
                : sql`(select ${productImages.id} from ${productImages} where ${productImages.productId} = ${productId} and ${productImages.storageKey} = ${coverKey})`,
            updatedAt: new Date(),
          })
          .where(and(eq(productVariants.id, variantId), eq(productVariants.productId, productId)))
      }
    })
  },
}

type ImageTx = Parameters<Parameters<typeof db.transaction>[0]>[0]

async function orderedKeys(tx: ImageTx, productId: string): Promise<string[]> {
  const rows = await tx
    .select({ storageKey: productImages.storageKey })
    .from(productImages)
    .where(eq(productImages.productId, productId))
    .orderBy(asc(productImages.position))

  return rows.map((row) => row.storageKey)
}

// Positions are always rewritten as a dense 0..n block: a gap left by a delete
// would make "first row" and "position zero" mean different things.
async function renumber(tx: ImageTx, productId: string, keys: readonly string[]): Promise<void> {
  for (const [position, key] of keys.entries()) {
    await tx
      .update(productImages)
      .set({ position })
      .where(and(eq(productImages.productId, productId), eq(productImages.storageKey, key)))
  }
}

export type AdminProductCover = {
  readonly storageKey: string
  readonly alt: string
}

// One extra query for the whole page rather than a scalar subquery per row:
// DISTINCT ON picks the lowest position per product, which is the shot the
// catalogue shows.
async function findCovers(productIds: readonly string[]): Promise<Map<string, AdminProductCover>> {
  if (productIds.length === 0) return new Map()

  const rows = await db
    .selectDistinctOn([productImages.productId], {
      productId: productImages.productId,
      storageKey: productImages.storageKey,
      squareStorageKey: productImages.squareStorageKey,
      alt: productImages.alt,
    })
    .from(productImages)
    .where(inArray(productImages.productId, [...productIds]))
    .orderBy(asc(productImages.productId), asc(productImages.position))

  return new Map(
    rows.map((row) => [
      row.productId,
      { storageKey: row.squareStorageKey ?? row.storageKey, alt: row.alt },
    ]),
  )
}
