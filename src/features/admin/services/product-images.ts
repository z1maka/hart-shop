import { adminProductRepository } from '@/features/admin/repository/admin-catalog-repository'
import { nextImageKeyIndex, removeProductImage, storeProductImage } from '@/lib/product-image'
import {
  ProductImageNotFoundError,
  ProductNotFoundError,
  UnsupportedImageError,
} from '@/lib/errors'

// Vercel refuses a request body over 4.5 MB before any of our code runs, so
// the accepted size has to sit below it with room for multipart overhead.
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const

export const productImageService = {
  async add(slug: string, file: File): Promise<void> {
    if (!ALLOWED_TYPES.some((type) => type === file.type)) {
      throw new UnsupportedImageError('JPEG, PNG, WebP and AVIF are accepted')
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new UnsupportedImageError('The file is larger than 4 MB')
    }

    const found = await adminProductRepository.findDraft(slug)
    if (!found) throw new ProductNotFoundError(slug)

    const position = await adminProductRepository.nextImagePosition(found.product.id)

    const stored = await storeProductImage(
      Buffer.from(await file.arrayBuffer()),
      slug,
      nextImageKeyIndex(found.images.map((image) => image.storageKey)),
    )

    await adminProductRepository.addImage({
      productId: found.product.id,
      storageKey: stored.storageKey,
      squareStorageKey: stored.squareStorageKey,
      alt: found.product.title,
      position,
      width: stored.width,
      height: stored.height,
    })
  },

  async remove(slug: string, storageKey: string): Promise<void> {
    const found = await adminProductRepository.findDraft(slug)
    if (!found) throw new ProductNotFoundError(slug)

    const image = await adminProductRepository.findImage(found.product.id, storageKey)
    if (!image) throw new ProductImageNotFoundError(storageKey)

    await adminProductRepository.deleteImage(found.product.id, storageKey)
    await removeProductImage(image)
  },

  async move(slug: string, storageKey: string, offset: -1 | 1): Promise<void> {
    const found = await adminProductRepository.findDraft(slug)
    if (!found) throw new ProductNotFoundError(slug)

    const moved = await adminProductRepository.moveImage(found.product.id, storageKey, offset)
    if (!moved) throw new ProductImageNotFoundError(storageKey)
  },

  async makeMain(slug: string, storageKey: string): Promise<void> {
    const found = await adminProductRepository.findDraft(slug)
    if (!found) throw new ProductNotFoundError(slug)

    const image = await adminProductRepository.findImage(found.product.id, storageKey)
    if (!image) throw new ProductImageNotFoundError(storageKey)

    await adminProductRepository.promoteImage(found.product.id, storageKey)
  },
}
