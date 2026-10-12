import type { ImageImportInput } from '@/features/catalog/repository/product-repository'
import { decodeEntities } from './html-text'
import { importProductImage } from './images'
import type { StoreImage } from './store-api'

export type GalleryImport = {
  // Brings a WordPress photo into this product's gallery once, however many
  // variations point at it, and answers with the storage key it lives under.
  readonly add: (image: StoreImage) => Promise<string>
  readonly images: () => ImageImportInput[]
}

// A product's gallery as the import assembles it: the WordPress gallery in
// order, then any shot a variation brought of its own. Keys carry the index,
// so the order of arrival is the order of keys.
export function createGalleryImport(productSlug: string, fallbackAlt: string): GalleryImport {
  const keyBySourceId = new Map<number, string>()
  const images: ImageImportInput[] = []

  return {
    async add(image) {
      const known = keyBySourceId.get(image.id)
      if (known) return known

      const index = images.length
      const stored = await importProductImage({ sourceUrl: image.src, productSlug, index })
      images.push({
        storageKey: stored.storageKey,
        squareStorageKey: stored.squareStorageKey,
        alt: decodeEntities(image.alt) || fallbackAlt,
        position: index,
        width: stored.width,
        height: stored.height,
      })
      keyBySourceId.set(image.id, stored.storageKey)
      return stored.storageKey
    },
    images: () => [...images],
  }
}
