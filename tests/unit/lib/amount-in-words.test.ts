import { describe, expect, it } from 'vitest'
import { amountInWords } from '@/lib/amount-in-words'

// Checked against the hand-made invoices, 05.11.2026.
describe('amountInWords', () => {
  it.each([
    [100, 'Одна гривня 00 копійок'],
    [2_100, 'Двадцять одна гривня 00 копійок'],
    [440_000, 'Чотири тисячі чотириста гривень 00 копійок'],
    [101_100, 'Одна тисяча одинадцять гривень 00 копійок'],
    [1_141_205, 'Одинадцять тисяч чотириста дванадцять гривень 05 копійок'],
    [200_000_000, 'Два мільйони гривень 00 копійок'],
    [710_000, 'Сім тисяч сто гривень 00 копійок'],
  ])('%i kopiykas', (cents, words) => {
    expect(amountInWords(cents)).toBe(words)
  })

  it('agrees the kopiykas and the small sums', () => {
    expect(amountInWords(1)).toBe('Нуль гривень 01 копійка')
    expect(amountInWords(222)).toBe('Дві гривні 22 копійки')
    expect(amountInWords(1_500)).toBe('П’ятнадцять гривень 00 копійок')
  })

  it('refuses what is not an amount', () => {
    expect(() => amountInWords(-1)).toThrow()
    expect(() => amountInWords(1.5)).toThrow()
    expect(() => amountInWords(100_000_000_000)).toThrow()
  })
})
