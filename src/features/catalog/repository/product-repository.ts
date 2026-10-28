import type { ProductVideo } from '@/features/catalog/model/product-video'
import type { FaqEntry } from '@/features/catalog/model/category-content'
import type { ColorSiblingRow } from '@/features/catalog/model/color-siblings'
import type { VariantOwner } from '@/features/catalog/model/merchant-feed'
import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  gte,
  ilike,
  inArray,
  isNotNull,
  lt,
  ne,
  notInArray,
  or,
  sql,
  type SQL,
  type SQLWrapper,
} from 'drizzle-orm'
import {
  categories,
  productImages,
  productVariants,
  products,
  type ProductSpec,
  type VariantOptions,
} from '@/db/schema'
import { ProductStatus } from '@/db/enums'
import { db } from '@/lib/db'
import { escapeLikePattern } from '@/lib/sql'

export type ProductImportInput = {
  readonly sourceId: number
  readonly slug: string
  readonly sku: string
  readonly title: string
  readonly description: string
  readonly categoryId: string
  readonly priceCents: number
  readonly salePriceCents: number | null
  readonly weightGrams: number
  readonly layers: number
  readonly badge: string | null
  readonly status: ProductStatus
  readonly specs: readonly ProductSpec[]
  readonly included: readonly string[]
  readonly careNotes: readonly string[]
  readonly seoTitle: string
  readonly seoDescription: string
}

export type VariantImportInput = {
  readonly sku: string
  readonly options: VariantOptions
  readonly priceDeltaCents: number
  readonly stockQty: number
  readonly position: number
  // The gallery image (by storage key) the donor shop showed for this colour.
  readonly coverStorageKey: string | null
}

export type ImageImportInput = {
  readonly storageKey: string
  readonly squareStorageKey: string
  readonly alt: string
  readonly position: number
  readonly width: number
  readonly height: number
}

export type ProductImportResult = {
  readonly productId: string
  readonly created: boolean
}

export const productRepository = {
  async upsertImported(
    product: ProductImportInput,
    variants: readonly VariantImportInput[],
    images: readonly ImageImportInput[],
  ): Promise<ProductImportResult> {
    return db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: products.id })
        .from(products)
        .where(eq(products.sourceId, product.sourceId))
        .limit(1)

      const productId = existing
        ? await updateProduct(tx, existing.id, product)
        : await insertProduct(tx, product)

      // Images first: a variant's cover points at one of them.
      await writeImages(tx, productId, images)
      await writeVariants(tx, productId, variants)

      return { productId, created: !existing }
    })
  },

  // The one-time cut-over from the imported engine catalog: rows whose slug is
  // not in the live shop keep their history but leave the storefront, and
  // their source ids are released so the import can create fresh rows.
  async archiveOutsideCatalog(keepSlugs: readonly string[]): Promise<string[]> {
    const rows = await db
      .update(products)
      .set({ status: ProductStatus.Archived, sourceId: null, updatedAt: new Date() })
      .where(and(notInArray(products.slug, [...keepSlugs]), sql`${products.sourceId} is not null`))
      .returning({ slug: products.slug })

    return rows.map((row) => row.slug)
  },

  async setStatus(slug: string, status: ProductStatus): Promise<boolean> {
    const rows = await db
      .update(products)
      .set({ status, updatedAt: new Date() })
      .where(eq(products.slug, slug))
      .returning({ id: products.id })

    return rows.length > 0
  },

  async findImportedBySourceId(sourceId: number): Promise<ImportedProductRef | null> {
    const [row] = await db
      .select({ id: products.id, slug: products.slug, title: products.title })
      .from(products)
      .where(eq(products.sourceId, sourceId))
      .limit(1)

    return row ?? null
  },

  // One more gallery shot for a product already imported, behind the ones it has.
  async addImage(productId: string, image: ImageImportInput): Promise<void> {
    await upsertImage(db, productId, image)
  },

  // Points a variant at one of its own product's photos; null clears the
  // choice. The answer says what the row holds afterwards, because a key that
  // names no photo of that product resolves to no cover at all.
  async setVariantCover(
    variantSku: string,
    storageKey: string | null,
  ): Promise<VariantCoverOutcome> {
    const [row] = await db
      .update(productVariants)
      .set({
        coverImageId:
          storageKey === null ? null : coverImageIdSql(productVariants.productId, storageKey),
        updatedAt: new Date(),
      })
      .where(eq(productVariants.sku, variantSku))
      .returning({ coverImageId: productVariants.coverImageId })

    return { found: row !== undefined, coverImageId: row?.coverImageId ?? null }
  },
}

export type ImportedProductRef = {
  readonly id: string
  readonly slug: string
  readonly title: string
}

export type VariantCoverOutcome = {
  readonly found: boolean
  readonly coverImageId: string | null
}

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0]
type Executor = Transaction | typeof db

// The id of one of the product's own photos, by storage key, or NULL when the
// key names nothing there: a cover can never point at another product.
function coverImageIdSql(productId: string | SQLWrapper, storageKey: string): SQL {
  return sql`(select ${productImages.id} from ${productImages} where ${productImages.productId} = ${productId} and ${productImages.storageKey} = ${storageKey})`
}

async function insertProduct(tx: Transaction, product: ProductImportInput): Promise<string> {
  const [row] = await tx
    .insert(products)
    .values({
      sourceId: product.sourceId,
      slug: product.slug,
      sku: product.sku,
      title: product.title,
      description: product.description,
      categoryId: product.categoryId,
      priceCents: product.priceCents,
      salePriceCents: product.salePriceCents,
      weightGrams: product.weightGrams,
      layers: product.layers,
      badge: product.badge,
      status: product.status,
      specs: product.specs,
      included: [...product.included],
      careNotes: [...product.careNotes],
      seoTitle: product.seoTitle,
      seoDescription: product.seoDescription,
    })
    .returning({ id: products.id })

  if (!row) {
    throw new Error(`Product "${product.slug}" could not be inserted`)
  }

  return row.id
}

// Status is left untouched on re-import: publishing state belongs to the admin,
// not to the donor catalog.
async function updateProduct(
  tx: Transaction,
  productId: string,
  product: ProductImportInput,
): Promise<string> {
  await tx
    .update(products)
    .set({
      slug: product.slug,
      sku: product.sku,
      title: product.title,
      description: product.description,
      categoryId: product.categoryId,
      priceCents: product.priceCents,
      salePriceCents: product.salePriceCents,
      weightGrams: product.weightGrams,
      layers: product.layers,
      badge: product.badge,
      specs: product.specs,
      included: [...product.included],
      careNotes: [...product.careNotes],
      seoTitle: product.seoTitle,
      seoDescription: product.seoDescription,
      updatedAt: new Date(),
    })
    .where(eq(products.id, productId))

  return productId
}

// Stock is deliberately not overwritten on re-import — it is warehouse data.
// A cover already chosen (by an earlier import or in the admin) stays for the
// same reason; the donor's shot fills in only where nothing was chosen yet.
async function writeVariants(
  tx: Transaction,
  productId: string,
  variants: readonly VariantImportInput[],
): Promise<void> {
  for (const variant of variants) {
    const coverImageId =
      variant.coverStorageKey === null ? null : coverImageIdSql(productId, variant.coverStorageKey)

    await tx
      .insert(productVariants)
      .values({
        productId,
        sku: variant.sku,
        options: variant.options,
        priceDeltaCents: variant.priceDeltaCents,
        stockQty: variant.stockQty,
        position: variant.position,
        coverImageId,
      })
      .onConflictDoUpdate({
        target: productVariants.sku,
        set: {
          options: variant.options,
          priceDeltaCents: variant.priceDeltaCents,
          position: variant.position,
          coverImageId: sql`coalesce(${productVariants.coverImageId}, ${coverImageId})`,
          isActive: true,
          updatedAt: new Date(),
        },
      })
  }

  // Retired, not deleted: cart_items cascades on a variant delete, so pruning
  // here would empty carts that shoppers are still using.
  await tx
    .update(productVariants)
    .set({ isActive: false, stockQty: 0, updatedAt: new Date() })
    .where(
      and(
        eq(productVariants.productId, productId),
        notInArray(
          productVariants.sku,
          variants.map((variant) => variant.sku),
        ),
      ),
    )
}

async function upsertImage(
  executor: Executor,
  productId: string,
  image: ImageImportInput,
): Promise<void> {
  await executor
    .insert(productImages)
    .values({
      productId,
      storageKey: image.storageKey,
      squareStorageKey: image.squareStorageKey,
      alt: image.alt,
      position: image.position,
      width: image.width,
      height: image.height,
    })
    .onConflictDoUpdate({
      target: productImages.storageKey,
      set: {
        squareStorageKey: image.squareStorageKey,
        alt: image.alt,
        position: image.position,
        width: image.width,
        height: image.height,
      },
    })
}

async function writeImages(
  tx: Transaction,
  productId: string,
  images: readonly ImageImportInput[],
): Promise<void> {
  for (const image of images) await upsertImage(tx, productId, image)

  await tx.delete(productImages).where(
    and(
      eq(productImages.productId, productId),
      notInArray(
        productImages.storageKey,
        images.map((image) => image.storageKey),
      ),
    ),
  )
}

export type CatalogSort = 'recommended' | 'price-asc' | 'price-desc' | 'weight-asc'

export type CatalogWeightBand = 'light' | 'heavy'

export type CatalogFilters = {
  readonly categorySlug: string | null
  readonly colors: readonly string[]
  readonly weightBand: CatalogWeightBand | null
  readonly sort: CatalogSort
  readonly limit: number
  readonly offset: number
}

export type ComparableProductRow = CatalogProductRow & {
  readonly specs: readonly ProductSpec[]
}

export type CatalogProductRow = {
  readonly id: string
  readonly slug: string
  readonly sku: string
  readonly title: string
  // Null until someone shortens it; every list falls back to the full title.
  readonly shortTitle: string | null
  readonly badge: string | null
  readonly layers: number
  readonly weightGrams: number
  readonly priceCents: number
  readonly salePriceCents: number | null
  readonly wholesaleMinQty: number | null
  readonly wholesalePriceCents: number | null
  readonly currency: string
  readonly categorySlug: string
  readonly categoryName: string
}

export type ProductDetailRow = CatalogProductRow & {
  readonly description: string
  readonly videos: readonly ProductVideo[]
  readonly summary: string | null
  readonly specs: readonly ProductSpec[]
  readonly included: readonly string[]
  readonly careNotes: readonly string[]
  readonly seoTitle: string | null
  readonly seoDescription: string | null
  readonly brand: string | null
  readonly colorGroup: string | null
  readonly faq: readonly FaqEntry[]
}

export type ProductVariantRow = {
  readonly id: string
  readonly productId: string
  readonly sku: string
  readonly options: VariantOptions
  readonly priceDeltaCents: number
  readonly stockQty: number
  readonly position: number
  readonly coverImageId: string | null
}

export type ProductImageRow = {
  readonly id: string
  readonly productId: string
  readonly storageKey: string
  readonly squareStorageKey: string | null
  readonly alt: string
  readonly position: number
  readonly width: number
  readonly height: number
}

const LIGHT_WEIGHT_LIMIT_GRAMS = 1000
const COLOR_OPTION_KEY = 'Color'

const catalogColumns = {
  id: products.id,
  slug: products.slug,
  sku: products.sku,
  title: products.title,
  shortTitle: products.shortTitle,
  badge: products.badge,
  layers: products.layers,
  weightGrams: products.weightGrams,
  priceCents: products.priceCents,
  salePriceCents: products.salePriceCents,
  wholesaleMinQty: products.wholesaleMinQty,
  wholesalePriceCents: products.wholesalePriceCents,
  currency: products.currency,
  categorySlug: categories.slug,
  categoryName: categories.name,
}

export type FeedProductRow = CatalogProductRow & {
  readonly sourceId: number | null
  readonly brand: string | null
  readonly colorGroup: string | null
  readonly description: string
  readonly specs: readonly { label: string; value: string }[]
  readonly productGoogleCategory: number | null
  readonly categoryGoogleCategory: number | null
}

export type SitemapEntryRow = {
  readonly id: string
  readonly slug: string
  readonly updatedAt: Date
}

export type ArchivedProductRow = {
  readonly categorySlug: string | null
  readonly isCategoryVisible: boolean | null
}

export const catalogReadRepository = {
  async findPublished(filters: CatalogFilters): Promise<CatalogProductRow[]> {
    return db
      .select(catalogColumns)
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(and(eq(products.status, ProductStatus.Published), ...publishedFilters(filters)))
      .orderBy(orderFor(filters.sort))
      .limit(filters.limit)
      .offset(filters.offset)
  },

  async countPublished(filters: CatalogFilters): Promise<number> {
    const [row] = await db
      .select({ total: count() })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(and(eq(products.status, ProductStatus.Published), ...publishedFilters(filters)))

    return row?.total ?? 0
  },

  async findDetailBySlug(slug: string): Promise<ProductDetailRow | null> {
    const [row] = await db
      .select({
        ...catalogColumns,
        description: products.description,
        videos: products.videos,
        specs: products.specs,
        included: products.included,
        careNotes: products.careNotes,
        summary: products.summary,
        seoTitle: products.seoTitle,
        seoDescription: products.seoDescription,
        brand: products.brand,
        colorGroup: products.colorGroup,
        faq: products.faq,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(and(eq(products.slug, slug), eq(products.status, ProductStatus.Published)))
      .limit(1)

    return row ?? null
  },

  async findPublishedCategorySlug(slug: string): Promise<string | null> {
    const [row] = await db
      .select({ categorySlug: categories.slug })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(and(eq(products.slug, slug), eq(products.status, ProductStatus.Published)))
      .limit(1)

    return row?.categorySlug ?? null
  },

  async findArchivedBySlug(slug: string): Promise<ArchivedProductRow | null> {
    const [row] = await db
      .select({ categorySlug: categories.slug, isCategoryVisible: categories.isVisible })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(eq(products.slug, slug), eq(products.status, ProductStatus.Archived)))
      .limit(1)

    return row ?? null
  },

  async findBySlugs(slugs: readonly string[]): Promise<ComparableProductRow[]> {
    if (slugs.length === 0) return []

    return db
      .select({ ...catalogColumns, specs: products.specs })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(and(eq(products.status, ProductStatus.Published), inArray(products.slug, [...slugs])))
  },

  // The owner's hand-picked best-sellers rail, in the order they set.
  async findCurated(limit: number): Promise<CatalogProductRow[]> {
    return db
      .select(catalogColumns)
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(and(eq(products.status, ProductStatus.Published), isNotNull(products.featuredOrder)))
      .orderBy(asc(products.featuredOrder))
      .limit(limit)
  },

  async findFeatured(
    categorySlugs: readonly string[],
    limit: number,
  ): Promise<CatalogProductRow[]> {
    return db
      .select(catalogColumns)
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(
        and(
          eq(products.status, ProductStatus.Published),
          inArray(categories.slug, [...categorySlugs]),
        ),
      )
      .orderBy(desc(products.priceCents))
      .limit(limit)
  },

  // One row per colour each published product of the group sells, in a fixed
  // order so every sibling page draws the tiles the same way.
  async findColorSiblings(colorGroup: string): Promise<ColorSiblingRow[]> {
    return db
      .selectDistinct({
        slug: products.slug,
        color: sql<string | null>`${productVariants.options}->>'Color'`,
      })
      .from(products)
      .innerJoin(
        productVariants,
        and(eq(productVariants.productId, products.id), eq(productVariants.isActive, true)),
      )
      .where(and(eq(products.colorGroup, colorGroup), eq(products.status, ProductStatus.Published)))
      .orderBy(sql`${productVariants.options}->>'Color'`, asc(products.slug))
  },

  async findPublishedSlugs(): Promise<string[]> {
    const rows = await db
      .select({ slug: products.slug })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(and(eq(products.status, ProductStatus.Published), eq(categories.isVisible, true)))

    return rows.map((row) => row.slug)
  },

  // The sitemap needs the real edit date per row: a lastmod that moves on every
  // fetch teaches crawlers to ignore it.
  async findPublishedForSitemap(): Promise<SitemapEntryRow[]> {
    return db
      .select({ id: products.id, slug: products.slug, updatedAt: products.updatedAt })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(and(eq(products.status, ProductStatus.Published), eq(categories.isVisible, true)))
      .orderBy(asc(products.slug))
  },

  // Everything a shopping feed row needs, for every product a shopper can
  // reach; variants and images come by product id in two more queries.
  async findPublishedForFeed(): Promise<FeedProductRow[]> {
    return db
      .select({
        ...catalogColumns,
        sourceId: products.sourceId,
        brand: products.brand,
        colorGroup: products.colorGroup,
        description: products.description,
        specs: products.specs,
        productGoogleCategory: products.googleProductCategory,
        categoryGoogleCategory: categories.googleProductCategory,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(and(eq(products.status, ProductStatus.Published), eq(categories.isVisible, true)))
      .orderBy(asc(products.slug))
  },

  async findVariantsByProductIds(productIds: readonly string[]): Promise<ProductVariantRow[]> {
    if (productIds.length === 0) return []

    // The sku breaks a tie in position, so every read lists a product's
    // variants alike: the feed's first-colour offer id rests on that order.
    return db
      .select({
        id: productVariants.id,
        productId: productVariants.productId,
        sku: productVariants.sku,
        options: productVariants.options,
        priceDeltaCents: productVariants.priceDeltaCents,
        stockQty: productVariants.stockQty,
        position: productVariants.position,
        coverImageId: productVariants.coverImageId,
      })
      .from(productVariants)
      .where(
        and(
          inArray(productVariants.productId, [...productIds]),
          eq(productVariants.isActive, true),
        ),
      )
      .orderBy(asc(productVariants.position), asc(productVariants.sku))
  },

  // The products these skus belong to: a variant's feed offer id depends on
  // its product's import id and on the product's other variants.
  async findVariantOwnersBySkus(skus: readonly string[]): Promise<VariantOwner[]> {
    if (skus.length === 0) return []

    return db
      .select({
        sku: productVariants.sku,
        productId: productVariants.productId,
        sourceId: products.sourceId,
      })
      .from(productVariants)
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(inArray(productVariants.sku, [...skus]))
  },

  async findImagesByProductIds(productIds: readonly string[]): Promise<ProductImageRow[]> {
    if (productIds.length === 0) return []

    return db
      .select({
        id: productImages.id,
        productId: productImages.productId,
        storageKey: productImages.storageKey,
        squareStorageKey: productImages.squareStorageKey,
        alt: productImages.alt,
        position: productImages.position,
        width: productImages.width,
        height: productImages.height,
      })
      .from(productImages)
      .where(inArray(productImages.productId, [...productIds]))
      .orderBy(asc(productImages.position))
  },

  async search(term: string, limit: number): Promise<CatalogProductRow[]> {
    const pattern = `%${escapeLikePattern(term)}%`

    const matchers = [
      ilike(products.title, pattern),
      ilike(products.sku, pattern),
      ilike(categories.name, pattern),
    ]

    return db
      .select(catalogColumns)
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(and(eq(products.status, ProductStatus.Published), or(...matchers)))
      .orderBy(asc(products.priceCents))
      .limit(limit)
  },

  async countByCategory(): Promise<{ categorySlug: string; total: number }[]> {
    return db
      .select({ categorySlug: categories.slug, total: count() })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(and(eq(products.status, ProductStatus.Published), eq(categories.isVisible, true)))
      .groupBy(categories.slug)
  },

  // Only colours a shopper can actually buy: a facet that filters to nothing is
  // worse than no facet.
  async findColors(): Promise<string[]> {
    const rows = await db
      .selectDistinct({ color: sql<string>`${productVariants.options} ->> ${COLOR_OPTION_KEY}` })
      .from(productVariants)
      .innerJoin(products, eq(productVariants.productId, products.id))
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(
        and(
          eq(productVariants.isActive, true),
          eq(products.status, ProductStatus.Published),
          eq(categories.isVisible, true),
        ),
      )

    return rows.map((row) => row.color).filter((color): color is string => Boolean(color))
  },

  async findRelated(
    categorySlug: string,
    excludeSlug: string,
    limit: number,
  ): Promise<CatalogProductRow[]> {
    return db
      .select(catalogColumns)
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(
        and(
          eq(products.status, ProductStatus.Published),
          eq(categories.slug, categorySlug),
          ne(products.slug, excludeSlug),
        ),
      )
      .orderBy(asc(products.priceCents))
      .limit(limit)
  },
}

function publishedFilters(filters: CatalogFilters): SQL[] {
  const conditions: SQL[] = []

  if (filters.categorySlug) {
    conditions.push(eq(categories.slug, filters.categorySlug))
  }

  if (filters.weightBand === 'light') {
    conditions.push(lt(products.weightGrams, LIGHT_WEIGHT_LIMIT_GRAMS))
  }

  if (filters.weightBand === 'heavy') {
    conditions.push(gte(products.weightGrams, LIGHT_WEIGHT_LIMIT_GRAMS))
  }

  if (filters.colors.length > 0) {
    conditions.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(productVariants)
          .where(
            and(
              eq(productVariants.productId, products.id),
              eq(productVariants.isActive, true),
              inArray(sql`${productVariants.options} ->> ${COLOR_OPTION_KEY}`, [...filters.colors]),
            ),
          ),
      ),
    )
  }

  return conditions
}

// The shelf the owner arranged in the admin list, then the home rail's
// picks, then the newest work. Price-first as the default put the cheapest
// thing in the shop — a T-shirt, a pair of arm covers — where the flagship
// belongs.
function orderFor(sort: CatalogSort): SQL {
  if (sort === 'price-asc') return asc(products.priceCents)
  if (sort === 'price-desc') return desc(products.priceCents)
  if (sort === 'weight-asc') return asc(products.weightGrams)
  return sql`${products.catalogOrder} asc nulls last, ${products.featuredOrder} asc nulls last, ${products.createdAt} desc`
}
