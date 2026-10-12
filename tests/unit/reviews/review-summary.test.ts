import { describe, expect, it } from 'vitest'
import {
  formatAverage,
  isValidRating,
  summarizeRatings,
} from '@/features/reviews/model/review-summary'

describe('summarizeRatings', () => {
  it('averages to one decimal and counts each star from five down', () => {
    const summary = summarizeRatings([5, 5, 4, 3])

    expect(summary.count).toBe(4)
    expect(summary.average).toBe(4.3)
    expect(summary.histogram).toEqual([
      { rating: 5, count: 2 },
      { rating: 4, count: 1 },
      { rating: 3, count: 1 },
      { rating: 2, count: 0 },
      { rating: 1, count: 0 },
    ])
  })

  it('ignores ratings outside one to five instead of skewing the average', () => {
    expect(summarizeRatings([5, 0, 6, 2.5]).count).toBe(1)
  })

  it('is empty rather than NaN when nothing is rated', () => {
    expect(summarizeRatings([])).toEqual({
      count: 0,
      average: 0,
      histogram: [5, 4, 3, 2, 1].map((rating) => ({ rating, count: 0 })),
    })
  })
})

describe('formatAverage', () => {
  it('prints the decimal comma of the storefront', () => {
    expect(formatAverage(4.7)).toBe('4,7')
    expect(formatAverage(5)).toBe('5,0')
  })
})

describe('isValidRating', () => {
  it.each([[1], [5]])('accepts %s', (value) => expect(isValidRating(value)).toBe(true))
  it.each([[0], [6], [4.5]])('rejects %s', (value) => expect(isValidRating(value)).toBe(false))
})
