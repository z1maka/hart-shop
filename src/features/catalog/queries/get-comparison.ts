import { MAX_COMPARED_PRODUCTS } from '@/config/catalog'
import { getTranslations } from 'next-intl/server'
import { effectivePrice, formatWeight } from '@/features/catalog/model/product-view'
import { catalogReadRepository } from '@/features/catalog/repository/product-repository'
import { formatMoney } from '@/lib/money'
import { publicUrl } from '@/lib/storage'

export type ComparisonColumn = {
  readonly slug: string
  readonly title: string
  readonly sku: string
  readonly imageUrl: string | null
}

export type ComparisonRow = {
  readonly label: string
  readonly values: readonly string[]
  readonly differs: boolean
  readonly isKeyFigure: boolean
}

export type ComparisonView = {
  readonly columns: readonly ComparisonColumn[]
  readonly rows: readonly ComparisonRow[]
}

const KEY_FIGURES = new Set(['price', 'weight', 'layers'])
const NOT_AVAILABLE = '—'

export async function getComparison(slugs: readonly string[]): Promise<ComparisonView> {
  const wanted = slugs.slice(0, MAX_COMPARED_PRODUCTS)
  const rows = await catalogReadRepository.findBySlugs(wanted)

  // Keep the order the shopper picked, not the order the database returned.
  const products = wanted
    .map((slug) => rows.find((row) => row.slug === slug))
    .filter((row): row is (typeof rows)[number] => row !== undefined)

  if (products.length === 0) return { columns: [], rows: [] }

  const [variants, images] = await Promise.all([
    catalogReadRepository.findVariantsByProductIds(products.map((product) => product.id)),
    catalogReadRepository.findImagesByProductIds(products.map((product) => product.id)),
  ])

  const columns = products.map((product) => {
    const cover = images.find((image) => image.productId === product.id && image.position === 0)

    return {
      slug: product.slug,
      title: product.title,
      sku: product.sku,
      imageUrl: cover ? publicUrl(cover.squareStorageKey ?? cover.storageKey) : null,
    }
  })

  const productT = await getTranslations('product')

  const specsFor = (product: (typeof products)[number]) => product.specs

  const specLabels = [
    ...new Set(products.flatMap((product) => specsFor(product).map((spec) => spec.label))),
  ]

  const rowsOut: ComparisonRow[] = [
    buildRow(
      'price',
      products.map((product) => formatMoney(effectivePrice(product.priceCents, product.salePriceCents))),
    ),
    buildRow(
      'weight',
      products.map((product) => formatWeight(product.weightGrams, productT('kgUnit'))),
    ),
    buildRow(
      'layers',
      products.map((product) => (product.layers > 1 ? String(product.layers) : NOT_AVAILABLE)),
    ),
    buildRow(
      'options',
      products.map((product) => {
        const labels = variants
          .filter((variant) => variant.productId === product.id)
          .map((variant) => Object.values(variant.options).join(' '))

        return labels.length > 0 ? [...new Set(labels)].join(', ') : NOT_AVAILABLE
      }),
    ),
    ...specLabels.map((label) =>
      buildRow(
        label,
        products.map(
          (product) =>
            specsFor(product).find((spec) => spec.label === label)?.value ?? NOT_AVAILABLE,
        ),
      ),
    ),
  ]

  return { columns, rows: rowsOut }
}

function buildRow(label: string, values: readonly string[]): ComparisonRow {
  return {
    label,
    values,
    differs: new Set(values).size > 1,
    isKeyFigure: KEY_FIGURES.has(label),
  }
}
