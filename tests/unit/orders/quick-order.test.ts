import { describe, expect, it } from 'vitest'
import { isQuickOrder, QUICK_ORDER_POINT_REF } from '@/features/orders/model/quick-order'

describe('isQuickOrder', () => {
  it('recognises the quick-order marker', () => {
    expect(isQuickOrder(QUICK_ORDER_POINT_REF)).toBe(true)
  })

  it.each([[null], ['manual'], ['e71f6b40-…nova-poshta-ref']])('treats %s as a full order', (ref) => {
    expect(isQuickOrder(ref)).toBe(false)
  })
})
