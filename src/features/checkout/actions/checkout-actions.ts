'use server'

import { Carrier, DeliveryKind, PaymentRoute } from '@/db/enums'
import { readTrafficTouch } from '@/features/analytics/session'
import { clearCartId, readCartId } from '@/features/cart/session'
import { normalizeOrderNote } from '@/features/checkout/model/order-note'
import { checkoutService } from '@/features/checkout/services/create-session'
import { QUICK_ORDER_POINT_REF } from '@/features/orders'
import { QuickOrderSchema, StartCheckoutSchema } from '@/features/checkout/schema/checkout-schema'
import { actionError, actionOk, toActionError, type ActionResult } from '@/lib/action-result'
import { requestOrigin } from '@/lib/request-context'

export async function startCheckoutAction(input: unknown): Promise<ActionResult<string>> {
  const parsed = StartCheckoutSchema.safeParse(input)
  if (!parsed.success)
    return actionError('VALIDATION_FAILED', 'Check the contact and delivery details.')

  const cartId = await readCartId()
  if (!cartId) return actionError('CART_NOT_FOUND', 'Your cart has expired.')

  try {
    const session = await checkoutService.placeOrder({
      cartId,
      email: parsed.data.email ?? null,
      carrier: parsed.data.carrier,
      deliveryKind: parsed.data.deliveryKind,
      paymentRoute: parsed.data.paymentRoute,
      cardProvider: parsed.data.cardProvider ?? null,
      address: parsed.data.address,
      pickupPoint: parsed.data.pickupPoint,
      customerNote: normalizeOrderNote(parsed.data.note),
      callbackOrigin: await requestOrigin(),
      traffic: await readTrafficTouch(),
    })

    // A card checkout keeps its cart until the acquirer confirms; an offline
    // order is final the moment it is placed.
    if (parsed.data.paymentRoute !== PaymentRoute.Card) {
      await clearCartId()
    }

    return actionOk(session.redirectUrl)
  } catch (error) {
    return toActionError(error)
  }
}

// Shown in the admin and the shop notification until the call settles the
// real branch; the buyer sees the same wording on the order page.
const QUICK_ORDER_POINT_LABEL = 'Відділення уточнюється при дзвінку'

export async function quickOrderAction(input: unknown): Promise<ActionResult<string>> {
  const parsed = QuickOrderSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION_FAILED', 'Check the phone number.')

  const cartId = await readCartId()
  if (!cartId) return actionError('CART_NOT_FOUND', 'Your cart has expired.')

  const point = { ref: QUICK_ORDER_POINT_REF, label: QUICK_ORDER_POINT_LABEL }

  try {
    const session = await checkoutService.placeOrder({
      cartId,
      email: null,
      carrier: Carrier.NovaPost,
      deliveryKind: DeliveryKind.Branch,
      paymentRoute: PaymentRoute.CashOnDelivery,
      // A quick order is always cash on delivery — no acquirer is involved.
      cardProvider: null,
      address: {
        fullName: '—',
        line1: '',
        city: point.label,
        phone: parsed.data.phone,
      },
      pickupPoint: point,
      customerNote: normalizeOrderNote(parsed.data.note),
      callbackOrigin: await requestOrigin(),
      traffic: await readTrafficTouch(),
    })

    await clearCartId()
    return actionOk(session.redirectUrl)
  } catch (error) {
    return toActionError(error)
  }
}
