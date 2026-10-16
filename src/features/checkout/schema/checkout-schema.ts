import { z } from 'zod'
import { Carrier, DeliveryKind, PaymentRoute } from '@/db/enums'
import { ORDER_NOTE_MAX_LENGTH } from '@/features/checkout/model/order-note'

const carriers = Object.values(Carrier) as [Carrier, ...Carrier[]]
const kinds = Object.values(DeliveryKind) as [DeliveryKind, ...DeliveryKind[]]
const routes = Object.values(PaymentRoute) as [PaymentRoute, ...PaymentRoute[]]

const line = z.string().trim().min(1).max(120)
const optionalLine = z.string().trim().max(120)
const orderNote = z.string().trim().max(ORDER_NOTE_MAX_LENGTH).optional()

// A parcel needs somewhere to go: the carrier takes the money on delivery,
// not the address.
export const ShippingAddressSchema = z.object({
  fullName: line,
  // Empty for a pick-up point: the branch identifier is the address.
  line1: optionalLine,
  line2: z.string().trim().max(120).optional(),
  city: line,
  phone: z.string().trim().min(6).max(32),
})

const PickupPointSchema = z.object({
  ref: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(200),
})

// Courier delivery needs a street; a branch or locker needs the carrier's own
// identifier instead. The union keeps the two from being half-filled at once.
export const StartCheckoutSchema = z
  .object({
    email: z.email().optional(),
    carrier: z.enum(carriers),
    deliveryKind: z.enum(kinds),
    paymentRoute: z.enum(routes),
    // Which acquirer the buyer chose for a card payment; the server keeps
    // only one it actually runs.
    cardProvider: z.string().trim().max(40).optional(),
    address: ShippingAddressSchema,
    pickupPoint: PickupPointSchema.optional(),
    note: orderNote,
  })
  .refine(
    (value) =>
      value.deliveryKind === DeliveryKind.Courier
        ? value.address.line1.trim() !== ''
        : value.pickupPoint !== undefined,
    { message: 'Pick where the parcel should go', path: ['deliveryKind'] },
  )

// The cart's 30-second order: the phone is the whole form. Delivery is a Nova
// Poshta branch agreed over the phone, payment is cash on delivery; naming
// the recipient, picking a branch or paying by card is the full checkout.
export const QuickOrderSchema = z.object({
  phone: z.string().trim().min(6).max(32),
  note: orderNote,
})

export type StartCheckoutInput = z.infer<typeof StartCheckoutSchema>
export type ShippingAddressInput = z.infer<typeof ShippingAddressSchema>
export type QuickOrderInput = z.infer<typeof QuickOrderSchema>
