import { describe, expect, it } from 'vitest'
import { cartErrorText } from '@/features/cart/model/cart-errors'

describe('cartErrorText', () => {
  const wordFor = (code: string) => `words for ${code}`

  it('words the cart errors the shop knows', () => {
    expect(
      cartErrorText({ code: 'CART_NOT_FOUND', message: 'Your cart has expired.' }, wordFor),
    ).toBe('words for CART_NOT_FOUND')
  })

  it('passes any other error through as the server put it', () => {
    expect(cartErrorText({ code: 'INTERNAL', message: 'Something broke.' }, wordFor)).toBe(
      'Something broke.',
    )
  })
})
