import { describe, expect, it } from 'vitest'
import { REVIEW_SURVEY_AFTER_BUSINESS_DAYS } from '@/config/reviews'
import { addBusinessDays, reviewSurveyOf } from '@/features/orders/model/review-survey'

describe('addBusinessDays', () => {
  it('counts weekdays only', () => {
    // Monday 19 October 2026.
    expect(addBusinessDays('2026-10-19', 3)).toBe('2026-10-22')
    // Thursday → the following Tuesday, over the weekend.
    expect(addBusinessDays('2026-10-22', 3)).toBe('2026-10-27')
  })

  it('starts counting on Monday for an order placed at the weekend', () => {
    expect(addBusinessDays('2026-10-24', 1)).toBe('2026-10-26')
  })

  it('keeps the date across the night the clocks go back', () => {
    // Kyiv leaves summer time on 25 October 2026.
    expect(addBusinessDays('2026-10-23', 1)).toBe('2026-10-26')
  })

  it('changes nothing for zero days', () => {
    expect(addBusinessDays('2026-10-19', 0)).toBe('2026-10-19')
  })
})

describe('reviewSurveyOf', () => {
  const order = {
    orderNumber: 'HART-2026-000042',
    email: ' buyer@example.com ',
    country: 'UA',
    placedDay: '2026-10-19',
  }

  it('hands Google the order, the email, the country and the delivery date', () => {
    expect(reviewSurveyOf(order, REVIEW_SURVEY_AFTER_BUSINESS_DAYS)).toEqual({
      orderId: 'HART-2026-000042',
      email: 'buyer@example.com',
      deliveryCountry: 'UA',
      estimatedDeliveryDate: addBusinessDays('2026-10-19', REVIEW_SURVEY_AFTER_BUSINESS_DAYS),
    })
  })

  it('offers nothing for an order without an email', () => {
    expect(reviewSurveyOf({ ...order, email: null }, 3)).toBeNull()
    expect(reviewSurveyOf({ ...order, email: '  ' }, 3)).toBeNull()
  })
})
