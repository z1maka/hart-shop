import { describe, expect, it } from 'vitest'
import { hasReviewText, looksLikeLocation } from '@/features/reviews/model/review-checks'
import {
  maskPhoneDigits,
  orderPhoneVariantsOf,
  reviewPhoneDigitsOf,
} from '@/features/reviews/model/review-phone'

describe('looksLikeLocation', () => {
  it.each([
    ['Наша точка біля с. Новоселівка, накидка виручає'],
    ['Стоїмо під Часовим Яром, тримає добре'],
    ['координати не скажу, але поле відкрите'],
    ['48.4567, 37.9876 — там і перевіряли'],
    ['37U DQ 12345 67890'],
    ['позиції в лісосмузі, накидку видно з 20 метрів'],
  ])('flags «%s»', (text) => {
    expect(looksLikeLocation(text)).toBe(true)
  })

  it.each([
    ['Взяв у липні, носив на позивний. Легке, не шарудить.'],
    ['Замовляв для підрозділу 6 шт, прийшли на наступний день.'],
    ['Під дощем не промокає, шви тримаються після двох прань.'],
  ])('leaves «%s» alone', (text) => {
    expect(looksLikeLocation(text)).toBe(false)
  })
})

describe('hasReviewText', () => {
  it('treats whitespace as no text', () => {
    expect(hasReviewText('   ')).toBe(false)
    expect(hasReviewText('Дякую')).toBe(true)
  })
})

describe('reviewPhoneDigitsOf', () => {
  it.each([
    ['+380 63 712 83 19', '380637128319'],
    ['0637128319', '380637128319'],
    ['80637128319', '380637128319'],
  ])('folds %s into the digits an order keeps', (raw, expected) => {
    expect(reviewPhoneDigitsOf(raw)).toBe(expected)
  })

  it('returns null for anything that is not a Ukrainian number', () => {
    expect(reviewPhoneDigitsOf('+49 30 123456')).toBeNull()
    expect(reviewPhoneDigitsOf(undefined)).toBeNull()
    expect(reviewPhoneDigitsOf('')).toBeNull()
  })
})

describe('maskPhoneDigits', () => {
  it('keeps the operator code and the last two digits', () => {
    expect(maskPhoneDigits('380671234521')).toBe('+380 67 ••• •• 21')
  })
})

describe('orderPhoneVariantsOf', () => {
  it('asks for the number in every form an order may have kept it', () => {
    expect(orderPhoneVariantsOf('380637128319')).toEqual([
      '380637128319',
      '80637128319',
      '0637128319',
    ])
  })
})
