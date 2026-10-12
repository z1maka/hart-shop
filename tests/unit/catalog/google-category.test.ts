import { describe, expect, it } from 'vitest'
import {
  effectiveGoogleCategory,
  findGoogleCategory,
  GOOGLE_CATEGORIES,
  isKnownGoogleCategory,
} from '@/features/catalog/model/google-category'

describe('google categories', () => {
  it('has one entry per id', () => {
    const ids = GOOGLE_CATEGORIES.map((category) => category.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('knows only the curated ids', () => {
    expect(isKnownGoogleCategory(5462)).toBe(true)
    expect(isKnownGoogleCategory(5598)).toBe(false)
    expect(findGoogleCategory(null)).toBeNull()
  })

  it("lets a product's own category win over its category's", () => {
    expect(effectiveGoogleCategory(1034, 5462)?.id).toBe(1034)
    expect(effectiveGoogleCategory(null, 5462)?.id).toBe(5462)
    expect(effectiveGoogleCategory(null, null)).toBeNull()
    expect(effectiveGoogleCategory(5598, 5462)?.id).toBe(5462)
  })

  it('marks only worn goods as apparel', () => {
    const apparel = GOOGLE_CATEGORIES.filter((category) => category.isApparel).map(
      (category) => category.id,
    )
    expect(apparel.sort()).toEqual([212, 5462])
  })
})
