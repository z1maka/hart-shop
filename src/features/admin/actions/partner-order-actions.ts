'use server'

import { z } from 'zod'
import { DeliveryKind } from '@/db/enums'
import { validationFailed } from '@/features/admin/model/validation-hints'
import { readAdminSession } from '@/features/admin/session-cookie'
import { ORDER_LINE_MAX_QUANTITY, orderAdminService } from '@/features/orders'
import { isWholeHryvniaPrice } from '@/features/orders/model/dropship-order'
import { actionError, actionOk, toActionError, type ActionResult } from '@/lib/action-result'

const PICKUP_KINDS = [DeliveryKind.Branch, DeliveryKind.Locker] as const
const MAX_LINES = 50
const KOPIYKAS_PER_HRYVNIA = 100
// No line of the shop's goods costs more; a typo of extra zeros is caught.
const AGREED_PRICE_MAX_HRYVNIAS = 1_000_000

const text = (min: number, max: number) => z.string().trim().min(min).max(max)

// The one place a price comes from a form (owner, 05.11.2026): a partner's
// deal agreed apart from the card, typed in whole hryvnias, admin only.
const agreedPrice = z
  .number()
  .int()
  .positive()
  .max(AGREED_PRICE_MAX_HRYVNIAS)
  .transform((hryvnias) => hryvnias * KOPIYKAS_PER_HRYVNIA)
  .refine(isWholeHryvniaPrice)
  .nullable()

const LineSchema = z.object({
  variantId: z.uuid(),
  quantity: z.number().int().min(1).max(ORDER_LINE_MAX_QUANTITY),
  agreedPrice,
})

const PickupSchema = z.object({
  kind: z.enum(PICKUP_KINDS),
  pointRef: text(1, 80),
  pointName: text(1, 200),
  settlementName: text(1, 200),
})

const CourierSchema = z.object({
  city: text(1, 120),
  line1: text(1, 120),
  line2: z.string().trim().max(120),
})

const PartnerOrderSchema = z
  .object({
    resellerId: z.uuid(),
    resellerOrderRef: z
      .string()
      .trim()
      .max(60)
      .transform((value) => value || null),
    fullName: text(3, 120),
    phone: text(6, 32),
    pickupPoint: PickupSchema.nullable(),
    courier: CourierSchema.nullable(),
    lines: z
      .array(LineSchema)
      .min(1)
      .max(MAX_LINES)
      .refine(
        (lines) => new Set(lines.map((line) => line.variantId)).size === lines.length,
        'один товар добавлен дважды',
      ),
  })
  .refine((value) => (value.pickupPoint === null) !== (value.courier === null), {
    path: ['pickupPoint'],
    message: 'выберите отделение или укажите адрес курьера',
  })

export async function createPartnerOrderAction(input: unknown): Promise<ActionResult<string>> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  const parsed = PartnerOrderSchema.safeParse(input)
  if (!parsed.success) return validationFailed(parsed.error)

  const { pickupPoint, courier, ...order } = parsed.data
  try {
    const placed = await orderAdminService.createDropshipOrder(
      {
        resellerId: order.resellerId,
        resellerOrderRef: order.resellerOrderRef,
        recipient: { fullName: order.fullName, phone: order.phone },
        deliveryKind: pickupPoint?.kind ?? DeliveryKind.Courier,
        pickupPoint: pickupPoint
          ? {
              ref: pickupPoint.pointRef,
              label: pickupPoint.pointName,
              settlementName: pickupPoint.settlementName,
            }
          : null,
        courierAddress: courier
          ? { city: courier.city, line1: courier.line1, line2: courier.line2 || null }
          : null,
        lines: order.lines.map((line) => ({
          variantId: line.variantId,
          quantity: line.quantity,
          agreedPriceCents: line.agreedPrice,
        })),
      },
      session.email,
    )
    return actionOk(placed.id)
  } catch (error) {
    return toActionError(error)
  }
}
