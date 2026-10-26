import { describe, expect, it } from 'vitest'
import {
  parsePrepaidInput,
  prepaidInput,
  typedPrepaidCents,
} from '@/features/admin/model/prepayment-input'

describe('prepaidInput', () => {
  it('opens at 0 when nothing was prepaid', () => {
    expect(prepaidInput(0)).toBe('0')
  })

  it('shows the saved prepayment in hryvnias', () => {
    expect(prepaidInput(100_000)).toBe('1000')
  })
})

describe('parsePrepaidInput', () => {
  it('reads whole hryvnias', () => {
    expect(parsePrepaidInput(' 1000 ')).toBe(1000)
  })

  it('takes an emptied field as no prepayment', () => {
    expect(parsePrepaidInput('')).toBe(0)
  })

  it('refuses kopiykas, signs and letters', () => {
    expect(parsePrepaidInput('999.50')).toBeNull()
    expect(parsePrepaidInput('-100')).toBeNull()
    expect(parsePrepaidInput('сто')).toBeNull()
  })
})

describe('typedPrepaidCents', () => {
  const TOTAL_CENTS = 4_200_000

  it('turns the typed hryvnias into kopiykas', () => {
    expect(typedPrepaidCents('1000', TOTAL_CENTS)).toBe(100_000)
  })

  it('refuses a prepayment that leaves the carrier nothing to collect', () => {
    expect(typedPrepaidCents('42000', TOTAL_CENTS)).toBeNull()
  })

  it('refuses what is not whole hryvnias', () => {
    expect(typedPrepaidCents('1000,5', TOTAL_CENTS)).toBeNull()
  })
})
