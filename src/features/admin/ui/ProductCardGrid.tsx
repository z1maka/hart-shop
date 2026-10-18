import Image from 'next/image'
import Link from 'next/link'
import type { AdminProductRow } from '@/features/admin/queries/get-admin-catalog'
import { ProductPublishToggle } from '@/features/admin/ui/ProductPublishToggle'
import { ProductStateBadge } from '@/features/admin/ui/ProductStateBadge'
import { cn } from '@/lib/utils'

// The catalogue the way the shop shows it: photo first. Weight and position
// are edited in the table; here a card opens the product.
export function ProductCardGrid({ rows }: { readonly rows: readonly AdminProductRow[] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(220px,100%),1fr))] gap-4">
      {rows.map((product) => (
        <ProductCard key={product.slug} product={product} />
      ))}
    </div>
  )
}

function ProductCard({ product }: { readonly product: AdminProductRow }) {
  const href = `/admin/catalog/${product.slug}`
  const metaLine = product.catalogPositionInput
    ? `${product.categoryName} · позиция ${product.catalogPositionInput}`
    : product.categoryName

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-card border border-subtle bg-raised">
      <Link
        href={href}
        className="relative block aspect-square overflow-hidden bg-sunken"
        tabIndex={-1}
        aria-hidden
      >
        {product.coverUrl ? (
          <Image
            src={product.coverUrl}
            alt={product.coverAlt}
            fill
            sizes="(min-width: 1280px) 20vw, (min-width: 768px) 30vw, 50vw"
            className="object-cover"
          />
        ) : (
          <span className="flex h-full items-center justify-center text-[12px] text-faint">
            нет фото
          </span>
        )}
        <ProductStateBadge state={product.state} className="absolute top-2.5 left-2.5" />
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <p className="text-[11.5px] font-semibold text-faint">{metaLine}</p>

        <h3 className="text-[14px] leading-[1.35] font-bold text-ink">
          <Link href={href} className="hover:text-accent hover:underline">
            {product.title}
          </Link>
        </h3>

        <p className="font-mono text-[11.5px] text-muted">{product.sku}</p>

        <div className="mt-auto flex items-end justify-between gap-2.5 pt-2">
          <div>
            <p className="text-[15px] font-bold text-ink">{product.priceLabel}</p>
            {product.struckPriceLabel ? (
              <s className="block text-[11.5px] text-faint">{product.struckPriceLabel}</s>
            ) : null}
            <p
              className={cn(
                'text-[11.5px] font-semibold',
                product.stock === 0 ? 'text-alert' : 'text-muted',
              )}
            >
              Остаток: {product.stock}
            </p>
          </div>
          <ProductPublishToggle
            slug={product.slug}
            title={product.title}
            isPublished={product.isPublished}
            isCategoryHidden={product.isCategoryHidden}
            isCompact
          />
        </div>
      </div>
    </article>
  )
}
