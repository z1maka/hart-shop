import { describe, expect, it } from 'vitest'
import { groupIban, ibanTail, isValidUaIban, mfoOfUaIban, normalizeIban } from '@/lib/iban'

const SHOP_IBAN = 'UA173220010000026005340071625'

describe('isValidUaIban', () => {
  it('accepts the shop account', () => {
    expect(isValidUaIban(SHOP_IBAN)).toBe(true)
  })

  it('accepts letters in the account part, as the IBAN registry allows', () => {
    expect(isValidUaIban('UA853220010000026005340071A25')).toBe(true)
    expect(isValidUaIban('UA853220010000026005340071B25')).toBe(false)
  })

  it('keeps the bank code numeric', () => {
    expect(isValidUaIban('UA17322A010000026005340071625')).toBe(false)
  })

  it('catches a single slipped digit', () => {
    expect(isValidUaIban('UA173220010000026005340071626')).toBe(false)
    expect(isValidUaIban('UA183220010000026005340071625')).toBe(false)
  })

  it('refuses anything that is not a 29-character Ukrainian account', () => {
    expect(isValidUaIban('UA17322001000002600534007162')).toBe(false)
    expect(isValidUaIban('DE89370400440532013000')).toBe(false)
    expect(isValidUaIban('')).toBe(false)
  })
})

describe('normalizeIban', () => {
  it('drops the spaces a bank prints and upper-cases the country', () => {
    expect(normalizeIban(' ua17 3220 0100 0002 6005 3400 7162 5 ')).toBe(SHOP_IBAN)
  })
})

describe('groupIban', () => {
  it('groups by four, the way a statement shows it', () => {
    expect(groupIban(SHOP_IBAN)).toBe('UA17 3220 0100 0002 6005 3400 7162 5')
  })
})

describe('mfoOfUaIban', () => {
  it('reads the bank code written into the account', () => {
    expect(mfoOfUaIban(SHOP_IBAN)).toBe('322001')
  })
})

describe('ibanTail', () => {
  it('keeps the last four characters people read accounts by', () => {
    expect(ibanTail(SHOP_IBAN)).toBe('1625')
  })
})
