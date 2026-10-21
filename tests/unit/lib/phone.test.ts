import { describe, expect, it } from 'vitest'
import { phoneCallHref } from '@/lib/phone'

describe('phoneCallHref', () => {
  it.each([
    ['+380 63 063 06 77', 'tel:+380630630677'],
    ['063 063 06 77', 'tel:+380630630677'],
    ['(063) 063-06-77', 'tel:+380630630677'],
  ])('dials %s', (raw, expected) => {
    expect(phoneCallHref(raw)).toBe(expected)
  })

  it.each([['not a phone'], ['+49 151 12345678'], ['']])('gives no link for %s', (raw) => {
    expect(phoneCallHref(raw)).toBeNull()
  })
})
