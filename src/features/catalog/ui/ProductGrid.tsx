import type { ProductCardView } from '@/features/catalog/model/product-view'
import { ProductCard, type ProductCardLayout } from '@/features/catalog/ui/ProductCard'
import { cn } from '@/lib/utils'

// `fill` keeps every card the catalogue's width, so a short last row stays
// aligned with the rows above. `row` is one row of four on a wide screen: four
// cards fill it with no empty column at the end, and a single companion keeps
// a card's width instead of stretching across the page.
type GridTrack = 'fill' | 'row'

const FILL_COLUMNS = 'grid-cols-[repeat(auto-fill,minmax(240px,1fr))]'

const TRACK_CLASSES: Record<GridTrack, string> = {
  fill: FILL_COLUMNS,
  row: `${FILL_COLUMNS} lg:grid-cols-4`,
}

type ProductGridProps = {
  readonly products: readonly ProductCardView[]
  readonly priorityCount?: number
  readonly highlightColors?: readonly string[]
  readonly layout?: ProductCardLayout
  readonly track?: GridTrack
}

export function ProductGrid({
  products,
  priorityCount = 0,
  highlightColors = [],
  layout = 'grid',
  track = 'fill',
}: ProductGridProps) {
  return (
    <div className={cn('grid gap-5', TRACK_CLASSES[track])}>
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
