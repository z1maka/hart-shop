import { ProductStatus } from '@/db/enums'
import type { FaqEntry } from '@/features/catalog/model/category-content'
import {
  adminProductRepository,
  type ProductImageRow,
  type ProductSpecRow,
  type ProductVariantRow,
} from '@/features/admin/repository/admin-catalog-repository'
import { ProductNotFoundError, ProductSkuTakenError, ProductSlugTakenError } from '@/lib/errors'

export type ProductDraft = {
  readonly id: string
  readonly slug: string
  readonly sku: string
  readonly title: string
  readonly shortTitle: string | null
  readonly seoTitle: string | null
  readonly seoDescription: string | null
  readonly description: string
  readonly categoryId: string | null
  readonly googleProductCategory: number | null
  readonly priceCents: number
  readonly salePriceCents: number | null
  readonly wholesaleMinQty: number | null
  readonly wholesalePriceCents: number | null
  readonly weightGrams: number
  readonly layers: number
  readonly summary: string
  readonly brand: string | null
  readonly colorGroup: string | null
  readonly faq: readonly FaqEntry[]
  readonly isPublished: boolean
  readonly specs: readonly ProductSpecRow[]
  readonly included: readonly string[]
  readonly careNotes: readonly string[]
  readonly variants: readonly ProductVariantRow[]
  readonly images: readonly ProductImageRow[]
  readonly updatedAt: Date
}

export type ProductCreateDraft = {
  readonly slug: string
  readonly sku: string
  readonly title: string
  readonly description: string
  readonly categoryId: string
  readonly priceCents: number
  readonly weightGrams: number
  readonly variantColor: string
}

export type ProductSaveInput = {
  readonly sku: string
  readonly slug: string
  readonly title: string
  readonly shortTitle: string | null
  readonly seoTitle: string | null
  readonly seoDescription: string | null
  readonly description: string
  readonly categoryId: string
  // Undefined: the form did not carry the field, keep what is stored.
  readonly googleProductCategory?: number | null
  readonly priceCents: number
  readonly salePriceCents: number | null
  readonly wholesaleMinQty: number | null
  readonly wholesalePriceCents: number | null
  readonly weightGrams: number
  readonly layers: number
  readonly summary: string
  readonly specs: readonly ProductSpecRow[]
  // Undefined: the form did not carry the field, keep what is stored.
  readonly brand?: string | null
  readonly colorGroup?: string | null
  readonly faq?: readonly FaqEntry[]
  readonly stockByVariantId: Readonly<Record<string, number>>
  readonly coverByVariantId: Readonly<Record<string, string | null>>
}

export const productAdminService = {
  async setStatus(slug: string, status: ProductStatus): Promise<void> {
    const changed = await adminProductRepository.setStatus(slug, status)
    if (!changed) throw new ProductNotFoundError(slug)
  },

  async setWeight(slug: string, weightGrams: number): Promise<void> {
    const changed = await adminProductRepository.setWeight(slug, weightGrams)
    if (!changed) throw new ProductNotFoundError(slug)
  },

  async setStatusMany(slugs: readonly string[], status: ProductStatus): Promise<number> {
    return adminProductRepository.setStatusMany(slugs, status)
  },

  async getDraft(slug: string): Promise<ProductDraft> {
    const found = await adminProductRepository.findDraft(slug)
    if (!found) throw new ProductNotFoundError(slug)

    return {
      id: found.product.id,
      slug: found.product.slug,
      sku: found.product.sku,
      title: found.product.title,
      shortTitle: found.product.shortTitle,
      seoTitle: found.product.seoTitle,
      seoDescription: found.product.seoDescription,
      description: found.product.description,
      categoryId: found.product.categoryId,
      googleProductCategory: found.product.googleProductCategory,
      priceCents: found.product.priceCents,
      salePriceCents: found.product.salePriceCents,
      wholesaleMinQty: found.product.wholesaleMinQty,
      wholesalePriceCents: found.product.wholesalePriceCents,
      weightGrams: found.product.weightGrams,
      layers: found.product.layers,
      summary: found.product.summary ?? '',
      brand: found.product.brand,
      colorGroup: found.product.colorGroup,
      faq: found.product.faq,
      included: found.product.included,
      careNotes: found.product.careNotes,
      updatedAt: found.product.updatedAt,
      isPublished: found.product.status === ProductStatus.Published,
      specs: found.product.specs,
      variants: found.variants,
      images: found.images,
    }
  },

  async create(input: ProductCreateDraft): Promise<string> {
    const [slugTaken, skuTaken] = await Promise.all([
      adminProductRepository.findDraft(input.slug),
      adminProductRepository.findBySku(input.sku),
    ])

    if (slugTaken) throw new ProductSlugTakenError(input.slug)
    if (skuTaken) throw new ProductSkuTakenError(input.sku)

    await adminProductRepository.createDraft(input)

    return input.slug
  },

  async save(slug: string, input: ProductSaveInput): Promise<string> {
    const current = await adminProductRepository.findDraft(slug)
    if (!current) throw new ProductNotFoundError(slug)

    if (input.slug !== slug) {
      const taken = await adminProductRepository.findDraft(input.slug)
      if (taken) throw new ProductSlugTakenError(input.slug)
    }

    await adminProductRepository.update(current.product.id, input)

    return input.slug
  },
}
