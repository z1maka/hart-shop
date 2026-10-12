import { describe, expect, it } from 'vitest'
import { isUaPhoneComplete, maskUaPhone, uaLocalPart } from '@/components/ui/UaPhoneField'

describe('maskUaPhone', () => {
  it.each([
    ['0630630677', '+380 63 063 06 77'],
    ['380630630677', '+380 63 063 06 77'],
    ['+380630630677', '+380 63 063 06 77'],
    ['63 063 06 77', '+380 63 063 06 77'],
  ])('folds %s into the +380 grouping', (raw, expected) => {
    expect(maskUaPhone(raw)).toBe(expected)
  })

  it('formats a partial number as it is typed', () => {
    expect(maskUaPhone('63')).toBe('+380 63')
    expect(maskUaPhone('6306')).toBe('+380 63 06')
  })

  it('drops the excess beyond nine subscriber digits', () => {
    expect(maskUaPhone('06306306778888')).toBe('+380 63 063 06 77')
  })

  it('lets the field be emptied completely', () => {
    expect(maskUaPhone('')).toBe('')
  })
})

describe('isUaPhoneComplete', () => {
  it('accepts the masked full number', () => {
    expect(isUaPhoneComplete('+380 63 063 06 77')).toBe(true)
  })

  it.each([[''], ['+380 63'], ['+380 63 063 06 7']])('rejects %s', (value) => {
    expect(isUaPhoneComplete(value)).toBe(false)
  })
})

describe('uaLocalPart', () => {
  it('shows only the digits after the fixed +380', () => {
    expect(uaLocalPart('+380 63 063 06 77')).toBe('63 063 06 77')
    expect(uaLocalPart('+380 63')).toBe('63')
  })

  it('folds a pasted full number or a leading 0 into the typed part', () => {
    expect(uaLocalPart('+380630630677')).toBe('63 063 06 77')
    expect(uaLocalPart('0630630677')).toBe('63 063 06 77')
  })

  it('is empty before the first digit', () => {
    expect(uaLocalPart('')).toBe('')
  })
})
