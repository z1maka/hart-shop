import 'dotenv/config'
import { ProductStatus } from '@/db/enums'
import { categoryRepository } from '@/features/catalog/repository/category-repository'
import {
  productRepository,
  type ProductImportInput,
  type VariantImportInput,
} from '@/features/catalog/repository/product-repository'
import { closeDb } from '@/lib/db'
import { createGalleryImport, type GalleryImport } from './lib/gallery'
import { decodeEntities, htmlToText } from './lib/html-text'
import {
  fetchAllProducts,
  fetchStoreCategories,
  fetchVariationDetail,
  priceInKopiykas,
  salePriceInKopiykas,
  type StoreProduct,
} from './lib/store-api'

// Products the WP shop left uncategorized are anti-drone covers by nature, so
// the owner keeps them in that category; the indexed WP URL 301s along
// (next.config.ts). The bucket itself is neither imported nor shown.
const FALLBACK_CATEGORY_SLUG = 'anti-dronovi-nakidki'
const SKIPPED_CATEGORY_SLUGS: ReadonlySet<string> = new Set(['без-категорії'])
const CATEGORY_REMAP: Record<string, string> = { 'без-категорії': FALLBACK_CATEGORY_SLUG }

// Header/footer order of the live shop; anything unknown sorts after.
const CATEGORY_ORDER: readonly string[] = [
  'anti-dronovi-nakidki',
  'чохли-для-starlink',
  'sholomi-bronepliti',
  'navushniki-taktichni-kreplenya',
  'ryukzaki',
  'noshi',
  'taktichna-forma',
]

// WooCommerce attribute names → the engine's option keys. Values stay in
// Ukrainian: they are what the shopper, the cart line and the waybill read.
const OPTION_KEY_BY_ATTRIBUTE: Record<string, string> = {
  Колір: 'Color',
  Розмір: 'Size',
}

// The Store API does not expose stock numbers, only availability. Everything
// on the live shop is sellable, so imported variants start with a real-looking
// stock the admin can correct.
const SEED_STOCK_QTY = 10

const SEO_DESCRIPTION_LIMIT = 300

async function main(): Promise<void> {
  const [storeCategories, storeProducts] = await Promise.all([
    fetchStoreCategories(),
    fetchAllProducts(),
  ])

  console.info(`Store API: ${storeProducts.length} products, ${storeCategories.length} categories`)

  const categoryIdBySlug = new Map<string, string>()

  for (const category of storeCategories) {
    const slug = decodeURIComponent(category.slug)
    if (SKIPPED_CATEGORY_SLUGS.has(slug)) continue
    const row = await categoryRepository.upsert({
      slug,
      name: decodeEntities(category.name),
      description: htmlToText(category.description),
      position: categoryPosition(slug),
    })
    categoryIdBySlug.set(slug, row.id)
    await categoryRepository.setVisibility(slug, true)
  }

  const wpCategorySlugs = new Set(categoryIdBySlug.keys())
  for (const category of await categoryRepository.findAllWithVisibility()) {
    if (!wpCategorySlugs.has(category.slug) && category.isVisible) {
      await categoryRepository.setVisibility(category.slug, false)
      console.info(`Hidden legacy category: ${category.slug}`)
    }
  }

  const keepSlugs = storeProducts.map((product) => decodeURIComponent(product.slug))
  const archived = await productRepository.archiveOutsideCatalog(keepSlugs)
  if (archived.length > 0) {
    console.info(`Archived ${archived.length} legacy products (kept in the database inactive)`)
  }

  let created = 0
  let updated = 0
  const failed: string[] = []

  for (const product of storeProducts) {
    const slug = decodeURIComponent(product.slug)

    try {
      const wasCreated = await importProduct(product, slug, categoryIdBySlug)
      if (wasCreated) {
        created += 1
      } else {
        updated += 1
      }
      console.info(`  ok ${slug}`)
    } catch (error) {
      failed.push(slug)
      console.error(`  FAILED ${slug}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  console.info(`\nDone: ${created} created, ${updated} updated, ${failed.length} failed`)

  if (failed.length > 0) {
    console.error(`Re-run to retry: ${failed.join(', ')}`)
    process.exitCode = 1
  }
}

async function importProduct(
  product: StoreProduct,
  slug: string,
  categoryIdBySlug: ReadonlyMap<string, string>,
): Promise<boolean> {
  const wpCategorySlug = decodeURIComponent(
    product.categories[0]?.slug ?? encodeURIComponent(FALLBACK_CATEGORY_SLUG),
  )
  const categorySlug = CATEGORY_REMAP[wpCategorySlug] ?? wpCategorySlug
  const categoryId = categoryIdBySlug.get(categorySlug)
  if (!categoryId) throw new Error(`Unknown category "${categorySlug}"`)

  const title = decodeEntities(product.name)
  const sku = product.sku.trim() || `FOX-UA-${product.id}`
  const regularKopiykas = priceInKopiykas(product)

  const draft: ProductImportInput = {
    sourceId: product.id,
    slug,
    sku,
    title,
    description: htmlToText(product.description),
    categoryId,
    priceCents: regularKopiykas,
    salePriceCents: salePriceInKopiykas(product),
    // The Store API carries no weights; zero means "not stated" and the
    // storefront simply leaves the weight out until the admin fills it in.
    weightGrams: 0,
    layers: 1,
    badge: null,
    status: ProductStatus.Draft,
    specs: [],
    included: [],
    careNotes: [],
    seoTitle: title,
    seoDescription: htmlToText(product.short_description).slice(0, SEO_DESCRIPTION_LIMIT),
  }

  // The gallery goes first so a variation's own shot can join it and be
  // named as that colour's cover.
  const gallery = createGalleryImport(slug, title)
  for (const image of product.images) await gallery.add(image)

  const variants = await buildVariants(product, sku, regularKopiykas, gallery)

  const result = await productRepository.upsertImported(draft, variants, gallery.images())

  if (result.created) {
    await productRepository.setStatus(slug, ProductStatus.Published)
  }

  return result.created
}

async function buildVariants(
  product: StoreProduct,
  baseSku: string,
  regularKopiykas: number,
  gallery: GalleryImport,
): Promise<VariantImportInput[]> {
  if (product.variations.length === 0) {
    return [
      {
        sku: `${baseSku}-STD`,
        options: {},
        priceDeltaCents: 0,
        stockQty: product.is_in_stock ? SEED_STOCK_QTY : 0,
        position: 0,
        coverStorageKey: null,
      },
    ]
  }

  const termNameByAttributeAndSlug = new Map<string, string>()
  for (const attribute of product.attributes) {
    for (const term of attribute.terms) {
      termNameByAttributeAndSlug.set(`${attribute.name}:${term.slug}`, decodeEntities(term.name))
    }
  }

  const variants: VariantImportInput[] = []

  for (const [position, variation] of product.variations.entries()) {
    const options: Record<string, string> = {}
    for (const attribute of variation.attributes) {
      const key = OPTION_KEY_BY_ATTRIBUTE[attribute.name] ?? attribute.name
      options[key] =
        termNameByAttributeAndSlug.get(`${attribute.name}:${attribute.value}`) ?? attribute.value
    }

    // Sale pricing lives on the product row; the delta is against the regular
    // price so a discount is never applied twice.
    const detail = await fetchVariationDetail(variation.id)

    variants.push({
      sku: `${baseSku}-V${variation.id}`,
      options,
      priceDeltaCents: detail.regularKopiykas - regularKopiykas,
      stockQty: product.is_in_stock ? SEED_STOCK_QTY : 0,
      position,
      coverStorageKey: detail.image ? await gallery.add(detail.image) : null,
    })
  }

  return variants
}

function categoryPosition(slug: string): number {
  const index = CATEGORY_ORDER.indexOf(slug)
  return index === -1 ? CATEGORY_ORDER.length : index
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeDb()
  })
