import Image from 'next/image'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Badge } from '@/components/ui/Badge'
import { ColorSwatch } from '@/components/ui/ColorSwatch'
import { Price } from '@/components/ui/Price'
import { QuickAddButton } from '@/features/cart/ui/QuickAddButton'
import { QuickChoiceDialog } from '@/features/cart/ui/QuickChoiceDialog'
import { CardSizeLabels } from '@/features/catalog/ui/CardSizeLabels'
import { CompareToggle } from '@/features/catalog/ui/CompareToggle'
import { cardImageFor, type ProductCardView } from '@/features/catalog/model/product-view'
import { COLOR_PARAM } from '@/features/catalog/model/requested-color'
import { formatAverage, RatingStars } from '@/features/reviews'
import { formatMoney } from '@/lib/money'

export type ProductCardLayout = 'grid' | 'compact'

type ProductCardProps = {
  readonly product: ProductCardView
  readonly isPriority?: boolean
  readonly highlightColors?: readonly string[]
  readonly layout?: ProductCardLayout
}

// The widest a card gets at each viewport, whether it sits in the home rail
// (whole cards per breakpoint) or in the auto-fill grid (240px columns, 20px
// gap), both inside the 1440px shell with 28px page padding. The breakpoints
// are where the grid adds a column, which is always the later of the two.
const CARD_IMAGE_SIZES =
  '(min-width: 1440px) 261px, (min-width: 1076px) calc(25vw - 29px), (min-width: 816px) calc(33.3vw - 32px), (min-width: 640px) calc(50vw - 38px), calc(100vw - 56px)'

export async function ProductCard({
  product,
  isPriority = false,
  highlightColors = [],
  layout = 'grid',
}: ProductCardProps) {
  const t = await getTranslations('product')
  const colorsT = await getTranslations('colors')
  const reviewsT = await getTranslations('reviews')
  const matchedColors = product.colors.filter((color) => highlightColors.includes(color))
  const orderedColors = [
    ...matchedColors,
    ...product.colors.filter((color) => !matchedColors.includes(color)),
  ]
  // A card filtered to a colour shows that colour, as the page it opens will.
  const image = cardImageFor(product, matchedColors[0])

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-card border border-subtle bg-raised">
      <Link
        href={productHref(product.slug, matchedColors)}
        className="relative block aspect-square overflow-hidden bg-sunken"
        tabIndex={-1}
        aria-hidden
      >
        {image ? (
          <Image
            src={image.url}
            alt={image.alt}
            fill
            sizes={CARD_IMAGE_SIZES}
            priority={isPriority}
            className="object-cover"
          />
        ) : null}
        {product.badge ? <Badge className="absolute top-2.5 left-2.5">{product.badge}</Badge> : null}
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        {product.metaLine ? (
          <p className="text-[11.5px] font-semibold text-faint">{product.metaLine}</p>
        ) : null}

        <h3 className="text-[14px] leading-[1.35] font-bold text-ink">
          <Link href={productHref(product.slug, matchedColors)} className="hover:text-accent">
            {product.title}
          </Link>
        </h3>

        {product.rating ? (
          <p className="flex items-center gap-1.5 text-[12px] text-muted">
            <RatingStars
              rating={Math.round(product.rating.average)}
              label={reviewsT('ratingAria', { rating: formatAverage(product.rating.average) })}
              size="sm"
            />
            <span className="font-semibold text-ink">{formatAverage(product.rating.average)}</span>
            <span>· {reviewsT('count', { count: product.rating.count })}</span>
          </p>
        ) : null}

        {orderedColors.length > 0 || product.sizeChoice ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {orderedColors.map((color) => (
              <ColorSwatch key={color} name={color} isSelected={matchedColors.includes(color)} />
            ))}
            {orderedColors.length > 0 && product.sizeChoice ? (
              <span aria-hidden className="mx-0.5 h-3.5 w-px bg-subtle" />
            ) : null}
            {product.sizeChoice ? <CardSizeLabels choice={product.sizeChoice} /> : null}
            {matchedColors.length > 0 ? (
              <span className="ml-1 text-[12px] font-semibold text-accent">
                {t('inThisModel', {
                  colors: matchedColors
                    .map((color) => (colorsT.has(color) ? colorsT(color) : color))
                    .join(', '),
                })}
              </span>
            ) : null}
          </div>
        ) : null}

        {layout === 'compact' ? (
          <div className="mt-auto flex items-center justify-between gap-2.5 pt-2">
            <div>
              <Price money={product.price} compareAt={product.regularPrice} note={t('vatIncluded')} />
              {product.wholesale ? (
                <p className="mt-1 text-[12px] font-semibold text-khaki-ink">
                  {t('wholesaleLine', {
                    min: product.wholesale.minQuantity,
                    price: formatMoney(product.wholesale.price),
                  })}
                </p>
              ) : null}
            </div>
            {product.quickAddVariantId ? (
              <CardAddButton
                product={product}
                variantId={product.quickAddVariantId}
                preferredColor={matchedColors[0] ?? null}
                label={t('add')}
              />
            ) : (
              <span className="flex min-h-10 items-center rounded-control border border-subtle bg-surface px-3.5 text-[13px] font-bold text-faint">
                {t('soldOut')}
              </span>
            )}
          </div>
        ) : (
          <div className="mt-auto pt-2">
            <div className="mb-2.5">
              <Price money={product.price} compareAt={product.regularPrice} note={t('vatIncluded')} />
            {product.wholesale ? (
              <p className="mt-1 text-[12px] font-semibold text-khaki-ink">
                {t('wholesaleLine', {
                  min: product.wholesale.minQuantity,
                  price: formatMoney(product.wholesale.price),
                })}
              </p>
            ) : null}
            </div>

            {product.quickAddVariantId ? (
              <CardAddButton
                product={product}
                variantId={product.quickAddVariantId}
                preferredColor={matchedColors[0] ?? null}
                label={t('addToCart')}
                className="w-full"
              />
            ) : (
              <span className="flex min-h-10 w-full items-center justify-center rounded-control border border-subtle bg-surface text-[13px] font-bold text-faint">
                {t('outOfStock')}
              </span>
            )}

            <CompareToggle slug={product.slug} />
          </div>
        )}
      </div>
    </article>
  )
}

// One variant in stock goes straight to the cart; several open the choice
// dialog, so a model or colour is never picked for the buyer.
function CardAddButton({
  product,
  variantId,
  preferredColor,
  label,
  className,
}: {
  readonly product: ProductCardView
  readonly variantId: string
  readonly preferredColor: string | null
  readonly label: string
  readonly className?: string
}) {
  if (product.variantChoiceCount <= 1) {
    return (
      <QuickAddButton
        variantId={variantId}
        productTitle={product.title}
        label={label}
        className={className}
        analyticsItem={analyticsItem(product)}
      />
    )
  }

  return (
    <QuickChoiceDialog
      productTitle={product.title}
      productHref={productHref(product.slug, preferredColor ? [preferredColor] : [])}
      image={product.image ? { url: product.image.url, alt: product.image.alt } : null}
      priceLabel={formatMoney(product.price)}
      variants={product.variants}
      preferredColor={preferredColor}
      analyticsItem={analyticsItem(product)}
      triggerLabel={label}
      triggerClassName={className}
    />
  )
}

function analyticsItem(product: ProductCardView) {
  return {
    sku: product.sku,
    title: product.title,
    priceCents: product.price.amountCents,
    quantity: 1,
    categorySlug: product.categorySlug,
  }
}

function productHref(slug: string, matchedColors: readonly string[]): string {
  const [color] = matchedColors
  return color
    ? `/product/${slug}/?${COLOR_PARAM}=${encodeURIComponent(color)}`
    : `/product/${slug}/`
}
