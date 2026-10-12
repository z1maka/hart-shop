'use server'

import { getCart, type CartView } from '@/features/cart/queries/get-cart'
import { actionOk, toActionError, type ActionResult } from '@/lib/action-result'

export async function getCartAction(): Promise<ActionResult<CartView | null>> {
  try {
    return actionOk(await getCart())
  } catch (error) {
    return toActionError(error)
  }
}
