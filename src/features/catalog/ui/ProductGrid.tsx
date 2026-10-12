import type { ProductCardView } from '@/features/catalog/model/product-view'
import { ProductCard, type ProductCardLayout } from '@/features/catalog/ui/ProductCard'

type ProductGridProps = {
  readonly products: readonly ProductCardView[]
  readonly priorityCount?: number
  readonly highlightColors?: readonly string[]
  readonly layout?: ProductCardLayout
}

export function ProductGrid({
  products,
  priorityCount = 0,
  highlightColors = [],
  layout = 'grid',
}: ProductGridProps) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-5">
      {products.map((product, index) => (
        <ProductCard
          key={product.slug}
          product={product}
          isPriority={index < priorityCount}
          highlightColors={highlightColors}
          layout={layout}
        />
      ))}
    </div>
  )
}
