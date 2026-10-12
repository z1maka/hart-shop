import { describe, expect, it } from 'vitest'
import { ConsentPolicy } from '@/config/consent'
import { ConsentState, shouldLoadTags } from '@/features/analytics/model/consent'

describe('shouldLoadTags — opt-out (the UA storefront)', () => {
  it('runs the tags for a visitor who has not answered, as WordPress did', () => {
    expect(shouldLoadTags(ConsentState.Unknown, ConsentPolicy.OptOut)).toBe(true)
    expect(shouldLoadTags(ConsentState.Granted, ConsentPolicy.OptOut)).toBe(true)
  })

  it('never tracks a visitor who refused', () => {
    expect(shouldLoadTags(ConsentState.Denied, ConsentPolicy.OptOut)).toBe(false)
  })
})

describe('shouldLoadTags — opt-in (the EU storefront)', () => {
  it('waits for an explicit yes', () => {
    expect(shouldLoadTags(ConsentState.Unknown, ConsentPolicy.OptIn)).toBe(false)
    expect(shouldLoadTags(ConsentState.Denied, ConsentPolicy.OptIn)).toBe(false)
    expect(shouldLoadTags(ConsentState.Granted, ConsentPolicy.OptIn)).toBe(true)
  })
})
