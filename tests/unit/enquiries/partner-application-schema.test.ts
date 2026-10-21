import { describe, expect, it } from 'vitest'
import { PartnerApplicationSchema } from '@/features/enquiries/schema/enquiry-schema'

function application(overrides: Record<string, unknown> = {}) {
  return {
    company: 'ТОВ «Кордура Плюс»',
    contactName: 'Ірина',
    phone: '+380 63 063 06 77',
    email: 'sales@example.com',
    products: 'Плитоноски й підсумки з кордури 500D, близько 40 позицій',
    model: 'dropshipping',
    ...overrides,
  }
}

describe('PartnerApplicationSchema', () => {
  it('takes an application without the optional tax id and links', () => {
    const parsed = PartnerApplicationSchema.safeParse(application())

    expect(parsed.success).toBe(true)
    expect(parsed.data?.taxId).toBeUndefined()
    expect(parsed.data?.links).toBeUndefined()
  })

  it('needs an email: terms and price lists go by mail', () => {
    expect(PartnerApplicationSchema.safeParse(application({ email: '' })).success).toBe(false)
  })

  it('accepts an 8-digit ЄДРПОУ and a 10-digit РНОКПП, spaces dropped', () => {
    const company = PartnerApplicationSchema.safeParse(application({ taxId: '1234 5678' }))
    const soleTrader = PartnerApplicationSchema.safeParse(application({ taxId: '3172012013' }))

    expect(company.data?.taxId).toBe('12345678')
    expect(soleTrader.success).toBe(true)
  })

  it('refuses a tax id of any other length', () => {
    expect(PartnerApplicationSchema.safeParse(application({ taxId: '123456789' })).success).toBe(
      false,
    )
  })

  it('treats an empty tax id as none', () => {
    const parsed = PartnerApplicationSchema.safeParse(application({ taxId: '' }))

    expect(parsed.success).toBe(true)
    expect(parsed.data?.taxId).toBeUndefined()
  })

  it('refuses a format the page does not offer', () => {
    expect(PartnerApplicationSchema.safeParse(application({ model: 'wholesale' })).success).toBe(
      false,
    )
  })

  it('refuses a description too short to judge the range by', () => {
    expect(PartnerApplicationSchema.safeParse(application({ products: 'жилети' })).success).toBe(
      false,
    )
  })
})
