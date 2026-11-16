import { adminProductRepository } from '@/features/admin/repository/admin-catalog-repository'
import { ProductNotFoundError, ProductVideoNotFoundError } from '@/lib/errors'

export const productVideoService = {
  // Only the product's list changes: the clip itself stays in the bucket,
  // since other products play the same file.
  async remove(slug: string, videoId: string): Promise<void> {
    const found = await adminProductRepository.findDraft(slug)
    if (!found) throw new ProductNotFoundError(slug)

    const isRemoved = await adminProductRepository.removeVideo(found.product.id, videoId)
    if (!isRemoved) throw new ProductVideoNotFoundError(videoId)
  },
}
