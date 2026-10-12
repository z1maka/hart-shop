import { describe, expect, it } from 'vitest'
import { toUkrainianMsisdn } from '@/features/orders/model/phone'

describe('toUkrainianMsisdn', () => {
  it.each([
    ['+380 63 063 06 77', '380630630677'],
    ['380630630677', '380630630677'],
    ['80630630677', '380630630677'],
    ['063 063 06 77', '380630630677'],
    ['(063) 063-06-77', '380630630677'],
  ])('normalizes %s', (raw, expected) => {
    expect(toUkrainianMsisdn(raw)).toBe(expected)
  })

  it.each([
    ['not a phone'],
    ['12345'],
    ['+49 151 12345678'],
    ['3800630630677'],
    ['06306306'],
  ])('rejects %s', (raw) => {
    expect(toUkrainianMsisdn(raw)).toBeNull()
  })
})
