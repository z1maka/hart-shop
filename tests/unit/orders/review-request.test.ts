import { describe, expect, it } from 'vitest'
import { reviewFormUrl, reviewRequestWindow } from '@/features/orders/model/review-request'

describe('reviewRequestWindow', () => {
  it('spans from withinDays ago to afterDays ago', () => {
    const window = reviewRequestWindow(new Date('2026-09-26T08:00:00Z'), 2, 14)

    expect(window.deliveredFrom.toISOString()).toBe('2026-09-12T08:00:00.000Z')
    expect(window.deliveredTo.toISOString()).toBe('2026-09-24T08:00:00.000Z')
  })
})

describe('reviewFormUrl', () => {
  it('points at the review form and encodes a Cyrillic slug', () => {
    expect(reviewFormUrl('https://fox-armor.com.ua', 'fx-2-thermal-poncho')).toBe(
      'https://fox-armor.com.ua/product/fx-2-thermal-poncho/#reviews',
    )
    expect(reviewFormUrl('https://fox-armor.com.ua', 'чохол-2')).toBe(
      'https://fox-armor.com.ua/product/%D1%87%D0%BE%D1%85%D0%BE%D0%BB-2/#reviews',
    )
  })
})
