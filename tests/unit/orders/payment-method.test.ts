import { describe, expect, it } from 'vitest'
import { cardProviderName } from '@/features/orders/model/payment-method'

describe('cardProviderName', () => {
  it('names mono by its acquiring brand', () => {
    expect(cardProviderName('mono')).toBe('plata by mono')
  })

  it('shows an unknown provider id as recorded', () => {
    expect(cardProviderName('liqpay')).toBe('liqpay')
  })

  it('has nothing to name without a provider', () => {
    expect(cardProviderName(null)).toBeNull()
  })
})
