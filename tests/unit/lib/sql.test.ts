import { describe, expect, it } from 'vitest'
import { escapeLikePattern } from '@/lib/sql'

describe('escapeLikePattern', () => {
  it('leaves an ordinary term untouched', () => {
    expect(escapeLikePattern('poncho')).toBe('poncho')
  })

  it('escapes the LIKE wildcards so they match themselves', () => {
    expect(escapeLikePattern('100%')).toBe('100\\%')
    expect(escapeLikePattern('fx_2')).toBe('fx\\_2')
  })

  it('escapes the escape character itself', () => {
    expect(escapeLikePattern('a\\b')).toBe('a\\\\b')
  })
})
