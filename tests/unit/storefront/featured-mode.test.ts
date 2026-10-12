import { describe, expect, it } from 'vitest'
import { FeaturedMode, parseFeaturedMode } from '@/config/storefront'

describe('parseFeaturedMode', () => {
  it('reads what the admin stored', () => {
    expect(parseFeaturedMode('auto')).toBe(FeaturedMode.Auto)
    expect(parseFeaturedMode('manual')).toBe(FeaturedMode.Manual)
  })

  it('falls back to the curated list for anything it does not know', () => {
    // A shop with nothing stored yet, or a value from an older release: the
    // rail the owner arranged is the safer default than one picked by us.
    expect(parseFeaturedMode(null)).toBe(FeaturedMode.Manual)
    expect(parseFeaturedMode('')).toBe(FeaturedMode.Manual)
    expect(parseFeaturedMode('random')).toBe(FeaturedMode.Manual)
    expect(parseFeaturedMode(42)).toBe(FeaturedMode.Manual)
  })
})
