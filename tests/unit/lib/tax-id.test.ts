import { describe, expect, it } from 'vitest'
import {
  hasValidRnokppCheckDigit,
  isValidTaxId,
  taxIdKindOf,
  taxIdLabel,
  TaxIdKind,
} from '@/lib/tax-id'

describe('tax ids', () => {
  it('tells a company code from a personal number by its length', () => {
    expect(taxIdKindOf('21133352')).toBe(TaxIdKind.Edrpou)
    expect(taxIdKindOf('3165519160')).toBe(TaxIdKind.Rnokpp)
    expect(taxIdKindOf('123')).toBeNull()
    expect(taxIdKindOf('31655191a0')).toBeNull()
  })

  it('labels the code as the invoice prints it', () => {
    expect(taxIdLabel('21133352')).toBe('ЄДРПОУ')
    expect(taxIdLabel('3165519160')).toBe('РНОКПП')
  })

  it('checks the РНОКПП check digit', () => {
    // The first partner and the shop's own ФОП (05.11.2026).
    expect(hasValidRnokppCheckDigit('3165519160')).toBe(true)
    expect(hasValidRnokppCheckDigit('3172012013')).toBe(true)
    expect(hasValidRnokppCheckDigit('3165519161')).toBe(false)
    expect(hasValidRnokppCheckDigit('21133352')).toBe(false)
  })

  it('accepts a company code as typed and a personal number only with its digit', () => {
    expect(isValidTaxId('21133352')).toBe(true)
    expect(isValidTaxId('3165519160')).toBe(true)
    expect(isValidTaxId('3165519161')).toBe(false)
    expect(isValidTaxId('')).toBe(false)
  })
})
