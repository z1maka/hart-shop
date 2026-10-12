import { describe, expect, it } from 'vitest'
import { cn, slugify, transliterate } from '@/lib/utils'

describe('transliterate', () => {
  it('romanises Ukrainian text', () => {
    expect(transliterate('Накидка Мультикам')).toBe('nakydka multykam')
  })

  it('uses the word-initial form of iotated letters', () => {
    expect(transliterate('Ярослав')).toBe('yaroslav')
    expect(transliterate('Мар’яна')).toBe('mariana')
  })

  it('applies the zgh digraph', () => {
    expect(transliterate('Згори')).toBe('zghory')
  })
})

describe('slugify', () => {
  it('produces a url-safe slug from Ukrainian text', () => {
    expect(slugify('Анти-дронова накидка PREDATOR')).toBe('anty-dronova-nakydka-predator')
  })

  it('collapses separators and trims edges', () => {
    expect(slugify('  FX13 / Zero — 2.0  ')).toBe('fx13-zero-2-0')
  })

  it('drops diacritics', () => {
    expect(slugify('Poncho Créme')).toBe('poncho-creme')
  })
})

describe('cn', () => {
  it('merges conflicting tailwind classes, last one wins', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
  })

  it('drops falsy values', () => {
    expect(cn('bg-surface', false && 'hidden', undefined)).toBe('bg-surface')
  })
})
