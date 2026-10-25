import { describe, expect, it } from 'vitest'
import {
  addMoney,
  createMoney,
  Currency,
  decimalAmount,
  formatMoney,
  formatWholeMoney,
  multiplyMoney,
  subtractMoney,
  sumMoney,
  zeroMoney,
} from '@/lib/money'

describe('createMoney', () => {
  it('keeps the amount and currency', () => {
    expect(createMoney(9690, Currency.Eur)).toEqual({ amountCents: 9690, currency: 'EUR' })
  })

  it('rejects fractional cents', () => {
    expect(() => createMoney(96.5, Currency.Eur)).toThrow(/integer/)
  })
})

describe('addMoney / subtractMoney', () => {
  it('adds amounts of the same currency', () => {
    const total = addMoney(createMoney(9690, Currency.Eur), createMoney(310, Currency.Eur))
    expect(total.amountCents).toBe(10_000)
  })

  it('subtracts amounts of the same currency', () => {
    const rest = subtractMoney(createMoney(10_000, Currency.Eur), createMoney(310, Currency.Eur))
    expect(rest.amountCents).toBe(9690)
  })

  it('refuses to mix currencies', () => {
    expect(() => addMoney(createMoney(100, Currency.Eur), createMoney(100, Currency.Uah))).toThrow(
      /Cannot mix currencies/,
    )
  })
})

describe('multiplyMoney', () => {
  it('rounds to whole cents', () => {
    expect(multiplyMoney(createMoney(9690, Currency.Eur), 1.27).amountCents).toBe(12_306)
  })

  it('rejects a non-finite factor', () => {
    expect(() => multiplyMoney(createMoney(100, Currency.Eur), Number.NaN)).toThrow(/finite/)
  })
})

describe('sumMoney', () => {
  it('returns zero for an empty list', () => {
    expect(sumMoney([], Currency.Eur)).toEqual(zeroMoney(Currency.Eur))
  })

  it('adds every amount', () => {
    const total = sumMoney(
      [
        createMoney(1000, Currency.Eur),
        createMoney(2500, Currency.Eur),
        createMoney(90, Currency.Eur),
      ],
      Currency.Eur,
    )
    expect(total.amountCents).toBe(3590)
  })
})

describe('formatMoney', () => {
  it('formats hryvnia amounts for the Ukrainian locale', () => {
    expect(formatMoney(createMoney(9690, Currency.Uah))).toBe('96,90\u00a0₴')
  })

  it('always shows two decimals', () => {
    expect(formatMoney(createMoney(10_000, Currency.Uah))).toBe('100,00\u00a0₴')
  })
})

describe('formatWholeMoney', () => {
  it('rounds to whole hryvnias with grouping', () => {
    expect(formatWholeMoney(createMoney(2_865_049, Currency.Uah))).toBe('28\u00a0650\u00a0₴')
    expect(formatWholeMoney(createMoney(-1_061_108, Currency.Uah))).toBe('-10\u00a0611\u00a0₴')
  })
})

describe('decimalAmount', () => {
  it('writes the amount without grouping or a currency sign', () => {
    expect(decimalAmount(4_180_000)).toBe('41800.00')
    expect(decimalAmount(9690)).toBe('96.90')
  })
})
