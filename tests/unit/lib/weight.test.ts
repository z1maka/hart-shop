import { describe, expect, it } from 'vitest'
import { formatKilos } from '@/lib/weight'

describe('formatKilos', () => {
  it('writes kilos without trailing zeros, in the given language', () => {
    expect(formatKilos(2500, 'uk-UA')).toBe('2,5')
    expect(formatKilos(3000, 'ru-RU')).toBe('3')
  })

  it('rounds to the asked precision', () => {
    expect(formatKilos(1234, 'ru-RU')).toBe('1,2')
    expect(formatKilos(1234, 'ru-RU', 2)).toBe('1,23')
  })
})
