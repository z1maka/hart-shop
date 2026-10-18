import { adminProductRepository } from '@/features/admin/repository/admin-catalog-repository'
import { requireAdminSession } from '@/features/admin/session-cookie'
import { productAdminService } from '@/features/admin/services/product-admin'
import { publicUrl } from '@/lib/storage'

export type ProductEditorImage = {
  readonly storageKey: string
  // The square crop for the tile; fullUrl is the whole shot for the viewer.
  readonly url: string
  readonly fullUrl: string
  readonly alt: string
}

export type ProductEditorVariant = {
  readonly id: string
  readonly sku: string
  readonly label: string
  readonly stock: number
  // The gallery photo chosen for this variant, by storage key; null means
  // the product's first photo.
  readonly coverStorageKey: string | null
}

export type ProductEditorCategory = {
  readonly id: string
  readonly name: string
  readonly isVisible: boolean
  readonly googleProductCategory: number | null
}

export type ProductEditorView = {
  readonly slug: string
  readonly sku: string
  readonly title: string
  // Empty when nothing shorter has been written yet.
  readonly shortTitle: string
  // Both empty when Google is left to take the title and the description.
  readonly seoTitle: string
  readonly seoDescription: string
  readonly description: string
  readonly categoryId: string
  // The product's own Google category id as the select holds it; empty
  // takes the category's.
  readonly googleCategoryInput: string
  readonly priceInput: string
  // Blank when the product is not on sale.
  readonly salePriceInput: string
  // Both blank when the product has no wholesale tier.
  readonly wholesalePriceInput: string
  readonly wholesaleMinQtyInput: string
  readonly weightInput: string
  readonly layers: number
  readonly summary: string
  // Empty for the shop's own sewing.
  readonly brand: string
  // Empty when the product is not one colour of a model sold per colour.
  readonly colorGroup: string
  readonly faq: readonly { question: string; answer: string }[]
  readonly isPublished: boolean
  readonly specs: readonly { label: string; value: string }[]
  readonly variants: readonly ProductEditorVariant[]
  readonly images: readonly ProductEditorImage[]
  readonly categories: readonly ProductEditorCategory[]
}

const KOPIYKAS_PER_HRYVNIA = 100
const GRAMS_PER_KILO = 1000

export async function getProductEditorView(slug: string): Promise<ProductEditorView> {
  await requireAdminSession()

  const [draft, categories] = await Promise.all([
    productAdminService.getDraft(slug),
    adminProductRepository.listCategories(),
  ])

  return {
    slug: draft.slug,
    sku: draft.sku,
    title: draft.title,
    shortTitle: draft.shortTitle ?? '',
    seoTitle: draft.seoTitle ?? '',
    seoDescription: draft.seoDescription ?? '',
    description: draft.description,
    categoryId: draft.categoryId ?? '',
    googleCategoryInput:
      draft.googleProductCategory === null ? '' : String(draft.googleProductCategory),
    priceInput: (draft.priceCents / KOPIYKAS_PER_HRYVNIA).toFixed(2),
    salePriceInput:
      draft.salePriceCents === null ? '' : (draft.salePriceCents / KOPIYKAS_PER_HRYVNIA).toFixed(2),
    wholesalePriceInput:
      draft.wholesalePriceCents === null
        ? ''
        : (draft.wholesalePriceCents / KOPIYKAS_PER_HRYVNIA).toFixed(2),
    wholesaleMinQtyInput: draft.wholesaleMinQty === null ? '' : String(draft.wholesaleMinQty),
    weightInput: (draft.weightGrams / GRAMS_PER_KILO).toFixed(2),
    layers: draft.layers,
    summary: draft.summary,
    brand: draft.brand ?? '',
    colorGroup: draft.colorGroup ?? '',
    faq: draft.faq.map((entry) => ({ question: entry.question, answer: entry.answer })),
    isPublished: draft.isPublished,
    specs: draft.specs.map((spec) => ({ label: spec.label, value: spec.value })),
    variants: draft.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      label: Object.values(variant.options).join(' · ') || variant.sku,
      stock: variant.stockQty,
      coverStorageKey:
        draft.images.find((image) => image.id === variant.coverImageId)?.storageKey ?? null,
    })),
    images: draft.images.map((image) => ({
      storageKey: image.storageKey,
      url: publicUrl(image.squareStorageKey ?? image.storageKey),
      fullUrl: publicUrl(image.storageKey),
      alt: image.alt,
    })),
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      isVisible: category.isVisible,
      googleProductCategory: category.googleProductCategory,
    })),
  }
}

export async function getProductCategories(): Promise<ProductEditorCategory[]> {
  await requireAdminSession()

  const categories = await adminProductRepository.listCategories()

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    isVisible: category.isVisible,
    googleProductCategory: category.googleProductCategory,
  }))
}
