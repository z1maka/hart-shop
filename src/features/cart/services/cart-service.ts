import {
  calculateCartTotals,
  clampQuantity,
  type CartTotals,
} from '@/features/cart/model/cart-math'
import { cartRepository, type CartItemRow } from '@/features/cart/repository/cart-repository'
import { CartNotFoundError, OutOfStockError, VariantNotFoundError } from '@/lib/errors'

export type CartSummary = {
  readonly cartId: string
  readonly items: readonly CartItemRow[]
  readonly totals: CartTotals
}

export const cartService = {
  async ensureCart(cartId: string | null): Promise<string> {
    if (cartId) {
      const existing = await cartRepository.findById(cartId)
      if (existing) return existing.id
    }

    const created = await cartRepository.create()
    return created.id
  },

  async getSummary(cartId: string | null): Promise<CartSummary | null> {
    if (!cartId) return null

    const cart = await cartRepository.findById(cartId)
    if (!cart) return null

    const items = await cartRepository.findItems(cart.id)
    const totals = calculateCartTotals(items)

    return { cartId: cart.id, items, totals }
  },

  async addItem(cartId: string, variantId: string, quantity: number): Promise<CartSummary> {
    const result = await cartRepository.addItem(cartId, variantId, clampQuantity(quantity))

    if (result.status === 'variant_missing') throw new VariantNotFoundError(variantId)
    if (result.status === 'out_of_stock') {
      throw new OutOfStockError(variantId, quantity, result.available)
    }

    return this.requireSummary(cartId)
  },

  async setQuantity(cartId: string, itemId: string, quantity: number): Promise<CartSummary> {
    const result = await cartRepository.setQuantity(cartId, itemId, clampQuantity(quantity))

    if (result.status === 'variant_missing') throw new VariantNotFoundError(itemId)
    if (result.status === 'out_of_stock') {
      throw new OutOfStockError(itemId, quantity, result.available)
    }

    return this.requireSummary(cartId)
  },

  async switchVariant(cartId: string, itemId: string, variantId: string): Promise<CartSummary> {
    const result = await cartRepository.switchVariant(cartId, itemId, variantId)

    if (result.status === 'variant_missing') throw new VariantNotFoundError(variantId)
    if (result.status === 'out_of_stock') {
      throw new OutOfStockError(variantId, result.requested, result.available)
    }

    return this.requireSummary(cartId)
  },

  async removeItem(cartId: string, itemId: string): Promise<CartSummary> {
    await cartRepository.removeItem(cartId, itemId)
    return this.requireSummary(cartId)
  },

  async clearCart(cartId: string): Promise<void> {
    await cartRepository.deleteCart(cartId)
  },

  async requireSummary(cartId: string): Promise<CartSummary> {
    const summary = await this.getSummary(cartId)
    if (!summary) throw new CartNotFoundError(cartId)
    return summary
  },
}
