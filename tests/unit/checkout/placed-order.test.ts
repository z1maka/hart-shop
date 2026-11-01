import { describe, expect, it } from 'vitest'
import {
  isJustPlaced,
  placedOrderPath,
  withoutPlacedMarker,
} from '@/features/checkout/model/placed-order'

describe('the order page reached from checkout', () => {
  it('is marked, so the page reports the sale', () => {
    expect(placedOrderPath('token-1')).toBe('/order/token-1/?placed=1')
    expect(isJustPlaced({ placed: '1' })).toBe(true)
  })

  it('is not marked when opened from the SMS or the mail', () => {
    expect(isJustPlaced({})).toBe(false)
    expect(isJustPlaced({ placed: ['1', '1'] })).toBe(false)
  })

  it('leaves the address bar without the marker, keeping the trailing slash', () => {
    expect(withoutPlacedMarker('https://hart-shop.com/order/token-1/?placed=1')).toBe(
      'https://hart-shop.com/order/token-1/',
    )
    expect(withoutPlacedMarker('https://hart-shop.com/order/token-1/?placed=1&utm_source=x')).toBe(
      'https://hart-shop.com/order/token-1/?utm_source=x',
    )
  })
})
