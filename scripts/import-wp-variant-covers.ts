import 'dotenv/config'
import {
  catalogReadRepository,
  productRepository,
  type ImportedProductRef,
  type ProductImageRow,
} from '@/features/catalog/repository/product-repository'
import { closeDb } from '@/lib/db'
import { nextImageKeyIndex, productImageKey } from '@/lib/product-image'
import { decodeEntities } from './lib/html-text'
import { importProductImage } from './lib/images'
import {
  fetchAllProducts,
  fetchVariationDetail,
  type StoreImage,
  type StoreProduct,
} from './lib/store-api'

// Gives every imported variant the photo WordPress showed for its colour.
// A colour's own shot either sits in the product gallery already (found by
// its place in the WordPress gallery, which the storage key remembers, for as
// long as that gallery still looks like the one imported) or is fetched now
// and added behind the gallery. A variant that already has a cover, from an
// earlier run or from the admin, is left as it is, so the script can be run
// again after an interruption without doubling any photo.
//
// The storefront caches catalog data by tag: after a run press «Обновить
// витрину» in the admin (any catalog save does the same) so the feed and the
// product pages pick the covers up.
//
// Usage: pnpm import:variant-covers [--dry-run]

const DRY_RUN_FLAG = '--dry-run'
const isDryRun = process.argv.includes(DRY_RUN_FLAG)

type Gallery = {
  readonly keys: Set<string>
  // Photos fetched in this run, by WordPress id: colours often share one.
  readonly importedKeyBySourceId: Map<number, string>
  readonly trustsSourceOrder: boolean
  readonly originalCount: number
}

type Outcome = { linked: number; kept: number; imported: number }

async function main(): Promise<void> {
  const storeProducts = (await fetchAllProducts()).filter(
    (product) => product.variations.length > 0,
  )
  console.info(`Store API: ${storeProducts.length} variable products${isDryRun ? ' (dry run)' : ''}`)

  const total: Outcome = { linked: 0, kept: 0, imported: 0 }
  let skipped = 0

  for (const product of storeProducts) {
    const slug = decodeURIComponent(product.slug)
    const target = await productRepository.findImportedBySourceId(product.id)

    if (!target) {
      skipped += 1
      console.warn(`  skip ${slug}: not imported`)
      continue
    }

    const outcome = await linkCovers(product, target)
    total.linked += outcome.linked
    total.kept += outcome.kept
    total.imported += outcome.imported
    console.info(
      `  ok ${slug}: ${outcome.linked} linked, ${outcome.kept} kept, ${outcome.imported} photos imported`,
    )
  }

  console.info(
    `\nDone: ${total.linked} variants linked, ${total.kept} kept as they were, ${total.imported} photos imported, ${skipped} products skipped`,
  )
}

async function linkCovers(product: StoreProduct, target: ImportedProductRef): Promise<Outcome> {
  const [variants, images] = await Promise.all([
    catalogReadRepository.findVariantsByProductIds([target.id]),
    catalogReadRepository.findImagesByProductIds([target.id]),
  ])
  const gallery: Gallery = {
    keys: new Set(images.map((image) => image.storageKey)),
    importedKeyBySourceId: new Map(),
    trustsSourceOrder: trustsSourceOrder(product, target.slug, images),
    originalCount: images.length,
  }
  const outcome: Outcome = { linked: 0, kept: 0, imported: 0 }

  for (const variation of product.variations) {
    const variant = variants.find((candidate) => candidate.sku.endsWith(`-V${variation.id}`))
    if (!variant) continue

    if (variant.coverImageId !== null) {
      outcome.kept += 1
      continue
    }

    const detail = await fetchVariationDetail(variation.id)
    if (!detail.image) continue

    const known = knownKeyOf(product, target.slug, detail.image.id, gallery)
    const isNew = known === null && !gallery.importedKeyBySourceId.has(detail.image.id)
    const key = known ?? (await importedKeyOf(target, detail.image, gallery))
    if (isNew) outcome.imported += 1

    await link(variant.sku, key)
    outcome.linked += 1
  }

  return outcome
}

// The import minted keys in WordPress gallery order, so a position can be
// trusted only while that gallery still looks like the one imported: every
// position has a key, and the alt text matches wherever WordPress has one.
function trustsSourceOrder(
  product: StoreProduct,
  slug: string,
  images: readonly ProductImageRow[],
): boolean {
  const byKey = new Map(images.map((image) => [image.storageKey, image]))

  return product.images.every((source, index) => {
    const ours = byKey.get(productImageKey(slug, index))
    if (!ours) return false

    const alt = decodeEntities(source.alt)
    return alt === '' || ours.alt === alt
  })
}

function knownKeyOf(
  product: StoreProduct,
  slug: string,
  sourceImageId: number,
  gallery: Gallery,
): string | null {
  if (!gallery.trustsSourceOrder) return null

  const index = product.images.findIndex((image) => image.id === sourceImageId)
  if (index === -1) return null

  const key = productImageKey(slug, index)
  return gallery.keys.has(key) ? key : null
}

async function importedKeyOf(
  target: ImportedProductRef,
  image: StoreImage,
  gallery: Gallery,
): Promise<string> {
  const known = gallery.importedKeyBySourceId.get(image.id)
  if (known) return known

  const index = nextImageKeyIndex([...gallery.keys])
  const position = gallery.originalCount + gallery.importedKeyBySourceId.size
  const key = isDryRun
    ? productImageKey(target.slug, index)
    : await importCover(target, image, index, position)
  if (isDryRun) console.info(`    would import ${image.src} as ${key}`)

  gallery.importedKeyBySourceId.set(image.id, key)
  gallery.keys.add(key)
  return key
}

async function importCover(
  target: ImportedProductRef,
  image: StoreImage,
  index: number,
  position: number,
): Promise<string> {
  const stored = await importProductImage({ sourceUrl: image.src, productSlug: target.slug, index })
  await productRepository.addImage(target.id, {
    storageKey: stored.storageKey,
    squareStorageKey: stored.squareStorageKey,
    alt: decodeEntities(image.alt) || target.title,
    position,
    width: stored.width,
    height: stored.height,
  })

  return stored.storageKey
}

async function link(variantSku: string, key: string): Promise<void> {
  if (isDryRun) {
    console.info(`    ${variantSku} -> ${key}`)
    return
  }

  const result = await productRepository.setVariantCover(variantSku, key)
  if (!result.found) {
    console.warn(`    ${variantSku}: variant not found`)
    return
  }
  if (result.coverImageId === null) {
    console.warn(`    ${variantSku}: ${key} is not in the gallery, cover left empty`)
    return
  }

  console.info(`    ${variantSku} -> ${key}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeDb()
  })
