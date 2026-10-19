import { describe, expect, it } from 'vitest'
import { Carrier, ContactPreference, DeliveryKind, PaymentRoute } from '@/db/enums'
import { StartCheckoutSchema } from '@/features/checkout/schema/checkout-schema'

const checkout = {
  carrier: Carrier.NovaPost,
  deliveryKind: DeliveryKind.Branch,
  paymentRoute: PaymentRoute.CashOnDelivery,
  address: { fullName: 'Іван Коваль', line1: '', city: 'Львів', phone: '+380631234567' },
  pickupPoint: { ref: 'point-1', label: 'Львів, відділення №12' },
}

describe('StartCheckoutSchema — contact preference', () => {
  it('falls back to the usual call when the form sends no choice', () => {
    const parsed = StartCheckoutSchema.parse(checkout)
    expect(parsed.contactPreference).toBe(ContactPreference.Call)
  })

  it('keeps the choice the buyer made', () => {
    const parsed = StartCheckoutSchema.parse({
      ...checkout,
      contactPreference: ContactPreference.NoCall,
    })
    expect(parsed.contactPreference).toBe(ContactPreference.NoCall)
  })

  it('refuses a channel the shop does not offer', () => {
    expect(
      StartCheckoutSchema.safeParse({ ...checkout, contactPreference: 'signal' }).success,
    ).toBe(false)
  })
})
