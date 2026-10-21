import { cartService } from '@/features/cart/services/cart-service'
import {
  isWholesaleLine,
  wholesaleAhead,
  type WholesaleLineInput,
} from '@/features/cart/model/wholesale-line'
import { lineModelOptionsOf, type LineModelOption } from '@/features/cart/model/line-models'
import { readCartId } from '@/features/cart/session'
import { createMoney, Currency, formatMoney, type Money } from '@/lib/money'
import { publicUrl } from '@/lib/storage'

export type CartLineView = {
  readonly id: string
  readonly variantId: string
  readonly sku: string
  readonly productSlug: string
  readonly title: string
  readonly variantLabel: string
  readonly color: string | null
  readonly size: string | null
  readonly modelOptions: readonly LineModelOption[]
  readonly quantity: number
  readonly unitPrice: Money
  readonly linePrice: Money
  readonly unitPriceLabel: string
  readonly linePriceLabel: string
  readonly imageUrl: string | null
  // The line is at the product's wholesale price.
  readonly isWholesalePrice: boolean
  // The tier ahead, while the product's quantity in the cart is below it.
  readonly wholesaleHint: {
    readonly minQuantity: number
    readonly unitPriceLabel: string
    readonly missing: number
  } | null
}

export type CartView = {
  readonly cartId: string
  readonly lines: readonly CartLineView[]
  readonly itemCount: number
  readonly subtotal: Money
  readonly weightGrams: number
  readonly subtotalLabel: string
}

export async function getCart(): Promise<CartView | null> {
  const summary = await cartService.getSummary(await readCartId())

  if (!summary) return null

  // The tier is earned by the product across its colours, so the count that
  // decides the hint is the product's, not the line's.
  const quantityByProduct = new Map<string, number>()
  for (const item of summary.items) {
    quantityByProduct.set(item.productId, (quantityByProduct.get(item.productId) ?? 0) + item.quantity)
  }

  return {
    cartId: summary.cartId,
    lines: summary.items.map((item) => ({
      id: item.id,
      variantId: item.variantId,
      sku: item.sku,
      productSlug: item.productSlug,
      title: item.productTitle,
      variantLabel: item.variantLabel,
      color: item.color,
      size: item.size,
      modelOptions: lineModelOptionsOf(item.sizeOptions, item.quantity),
      quantity: item.quantity,
      unitPrice: createMoney(item.unitPriceCents, Currency.Uah),
      linePrice: createMoney(item.unitPriceCents * item.quantity, Currency.Uah),
      unitPriceLabel: formatMoney(createMoney(item.unitPriceCents, Currency.Uah)),
      linePriceLabel: formatMoney(createMoney(item.unitPriceCents * item.quantity, Currency.Uah)),
      imageUrl: item.imageStorageKey ? publicUrl(item.imageStorageKey) : null,
      isWholesalePrice: isWholesaleLine(item, quantityByProduct.get(item.productId) ?? item.quantity),
      wholesaleHint: wholesaleHintOf(item, quantityByProduct.get(item.productId) ?? item.quantity),
    })),
    itemCount: summary.totals.itemCount,
    subtotal: summary.totals.subtotal,
    weightGrams: summary.totals.weightGrams,
    subtotalLabel: formatMoney(summary.totals.subtotal),
  }
}

export async function getCartItemCount(): Promise<number> {
  const summary = await cartService.getSummary(await readCartId())
  return summary?.totals.itemCount ?? 0
}

function wholesaleHintOf(
  item: WholesaleLineInput,
  productQuantity: number,
): CartLineView['wholesaleHint'] {
  const ahead = wholesaleAhead(item, productQuantity)
  if (!ahead) return null

  return {
    minQuantity: ahead.minQuantity,
    unitPriceLabel: formatMoney(createMoney(ahead.unitPriceCents, Currency.Uah)),
    missing: ahead.missing,
  }
}

// How many of this product the shopper's cart already holds, across its
// colours: the product page counts them towards the tier.
export async function getProductQuantityInCart(productSlug: string): Promise<number> {
  const summary = await cartService.getSummary(await readCartId())
  if (!summary) return 0

  return summary.items
    .filter((item) => item.productSlug === productSlug)
    .reduce((total, item) => total + item.quantity, 0)
}
