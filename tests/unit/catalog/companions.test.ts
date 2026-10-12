import { describe, expect, it } from 'vitest'
import { interleaveByCategory, pickCompanions } from '@/features/catalog/model/companions'

const row = (slug: string, categorySlug: string) => ({ slug, categorySlug })

describe('interleaveByCategory', () => {
  it('takes the categories in turn, in the configured order', () => {
    const rows = [row('a1', 'a'), row('a2', 'a'), row('b1', 'b')]
    expect(interleaveByCategory(rows, ['b', 'a']).map((r) => r.slug)).toEqual(['b1', 'a1', 'a2'])
  })
})

describe('pickCompanions', () => {
  const base = {
    excludeSlug: 'poncho',
    limit: 4,
    pinnedOrder: ['hands', 'legs'],
    pinned: [row('legs', 'capes'), row('hands', 'capes')],
    categoryOrder: ['starlink', 'packs'],
    fromCategories: [row('s1', 'starlink'), row('s2', 'starlink'), row('p1', 'packs')],
    sameCategory: [row('poncho', 'capes'), row('tent', 'capes')],
  }

  it('puts pinned companions first in their configured order, then interleaves categories', () => {
    expect(pickCompanions(base).map((r) => r.slug)).toEqual(['hands', 'legs', 's1', 'p1'])
  })

  it('never shows the viewed product and tops up from its own category', () => {
    const picked = pickCompanions({ ...base, pinned: [], fromCategories: [row('s1', 'starlink')] })
    expect(picked.map((r) => r.slug)).toEqual(['s1', 'tent'])
  })

  it('does not repeat a product that appears in several pools', () => {
    const picked = pickCompanions({ ...base, sameCategory: [row('hands', 'capes')] })
    expect(picked.filter((r) => r.slug === 'hands')).toHaveLength(1)
  })
})
