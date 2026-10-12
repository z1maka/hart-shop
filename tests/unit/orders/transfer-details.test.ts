import { describe, expect, it } from 'vitest'
import { transferAmountText, transferSummary } from '@/features/orders/model/transfer-details'

describe('transferAmountText', () => {
  it('writes whole hryvnias as a bare integer', () => {
    expect(transferAmountText(4_180_000)).toBe('41800')
    expect(transferAmountText(205_000)).toBe('2050')
  })

  it('keeps kopecks when there are any', () => {
    expect(transferAmountText(205_050)).toBe('2050.50')
  })
})

describe('transferSummary', () => {
  it('prefers the paste-ready value, so the IBAN arrives without spaces', () => {
    const summary = transferSummary([
      { key: 'iban', label: 'IBAN', value: 'UA17 3220 0100', copyValue: 'UA1732200100' },
      { key: 'bank', label: 'Банк', value: 'АТ «УНІВЕРСАЛ БАНК», МФО 322001' },
    ])

    expect(summary).toBe('IBAN: UA1732200100\nБанк: АТ «УНІВЕРСАЛ БАНК», МФО 322001')
  })

  it('lets a row say something else in the forwarded text', () => {
    const summary = transferSummary([
      {
        key: 'amount',
        label: 'Сума',
        value: '2 050,00 ₴',
        copyValue: '2050',
        summaryValue: '2 050,00 ₴',
      },
    ])

    expect(summary).toBe('Сума: 2 050,00 ₴')
  })
})
