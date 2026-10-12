'use server'

import { updateTag } from 'next/cache'
import { cartService } from '@/features/cart/services/cart-service'
import {
  AddToCartSchema,
  RemoveCartItemSchema,
  UpdateCartItemSchema,
} from '@/features/cart/schema/cart-schema'
import { readCartId, writeCartId } from '@/features/cart/session'
import { actionError, actionOk, toActionError, type ActionResult } from '@/lib/action-result'

export type CartActionData = {
  readonly itemCount: number
  readonly subtotalCents: number
}

export async function addToCartAction(input: unknown): Promise<ActionResult<CartActionData>> {
  const parsed = AddToCartSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION_FAILED', 'Check the selected variant.')

  try {
    const cartId = await cartService.ensureCart(await readCartId())
    await writeCartId(cartId)

    const summary = await cartService.addItem(cartId, parsed.data.variantId, parsed.data.quantity)
    updateTag('cart')

    return actionOk(toActionData(summary.totals.itemCount, summary.totals.subtotal.amountCents))
  } catch (error) {
    return toActionError(error)
  }
}

export async function updateCartItemAction(input: unknown): Promise<ActionResult<CartActionData>> {
  const parsed = UpdateCartItemSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION_FAILED', 'Check the quantity.')

  const cartId = await readCartId()
  if (!cartId) return actionError('CART_NOT_FOUND', 'Your cart has expired.')

  try {
    const summary = await cartService.setQuantity(cartId, parsed.data.itemId, parsed.data.quantity)
    updateTag('cart')

    return actionOk(toActionData(summary.totals.itemCount, summary.totals.subtotal.amountCents))
  } catch (error) {
    return toActionError(error)
  }
}

export async function removeCartItemAction(input: unknown): Promise<ActionResult<CartActionData>> {
  const parsed = RemoveCartItemSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION_FAILED', 'Check the item.')

  const cartId = await readCartId()
  if (!cartId) return actionError('CART_NOT_FOUND', 'Your cart has expired.')

  try {
    const summary = await cartService.removeItem(cartId, parsed.data.itemId)
    updateTag('cart')

    return actionOk(toActionData(summary.totals.itemCount, summary.totals.subtotal.amountCents))
  } catch (error) {
    return toActionError(error)
  }
}

function toActionData(itemCount: number, subtotalCents: number): CartActionData {
  return { itemCount, subtotalCents }
}

// Saved when a buyer leaves checkout for the quote form, so the details they
// already typed follow them across rather than being asked for twice.
