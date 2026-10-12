import { describe, expect, it } from 'vitest'
import { CustomOrderSchema } from '@/features/enquiries/schema/enquiry-schema'

function request(overrides: Record<string, unknown> = {}) {
  return {
    item: 'tent',
    details: 'Тент 3×4 м, люверси по периметру, мультикам',
    quantity: '1',
    phone: '+380 63 063 06 77',
    ...overrides,
  }
}

describe('CustomOrderSchema', () => {
  it('takes a request with a phone and nothing else', () => {
    const parsed = CustomOrderSchema.safeParse(request())

    expect(parsed.success).toBe(true)
    expect(parsed.data?.quantity).toBe(1)
    expect(parsed.data?.email).toBeUndefined()
  })

  it('refuses a number too short to call', () => {
    expect(CustomOrderSchema.safeParse(request({ phone: '063' })).success).toBe(false)
  })

  it('accepts a phone written any way a person writes it', () => {
    for (const phone of ['0630630677', '+380630630677', '(063) 063-06-77']) {
      expect(CustomOrderSchema.safeParse(request({ phone })).success).toBe(true)
    }
  })

  it('treats an empty address as no address rather than a broken one', () => {
    const parsed = CustomOrderSchema.safeParse(request({ email: '' }))

    expect(parsed.success).toBe(true)
    expect(parsed.data?.email).toBeUndefined()
  })

  it('still refuses an address that is filled in wrongly', () => {
    expect(CustomOrderSchema.safeParse(request({ email: 'not-an-address' })).success).toBe(false)
  })

  it('refuses a description too short to quote from', () => {
    expect(CustomOrderSchema.safeParse(request({ details: 'тент' })).success).toBe(false)
  })

  it('refuses a quantity that is not a whole count', () => {
    expect(CustomOrderSchema.safeParse(request({ quantity: '0' })).success).toBe(false)
    expect(CustomOrderSchema.safeParse(request({ quantity: '2.5' })).success).toBe(false)
  })

  it('refuses an item the workshop has no chip for', () => {
    expect(CustomOrderSchema.safeParse(request({ item: 'helicopter' })).success).toBe(false)
  })
})
