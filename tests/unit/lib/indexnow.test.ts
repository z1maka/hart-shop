import { describe, expect, it } from 'vitest'
import { INDEXNOW_KEY } from '@/config/indexnow'
import { indexNowPayload } from '@/lib/indexnow'

describe('indexNowPayload', () => {
  it("sends the shop's host and key with each URL once", () => {
    const payload = indexNowPayload([
      'https://hart-shop.com/product/ryukzak-hidrator/',
      'https://hart-shop.com/product/ryukzak-hidrator/',
      'https://hart-shop.com/guides/',
    ])

    expect(payload).toEqual({
      host: 'hart-shop.com',
      key: INDEXNOW_KEY,
      urlList: ['https://hart-shop.com/product/ryukzak-hidrator/', 'https://hart-shop.com/guides/'],
    })
  })

  it('leaves out other hosts and malformed input, which would fail the whole batch', () => {
    const payload = indexNowPayload([
      'https://fox-armor.com.ua/product/ryukzak-hidrator/',
      'https://media.hart-shop.com/products/a/1.webp',
      'not a url',
      'https://hart-shop.com/',
    ])

    expect(payload.urlList).toEqual(['https://hart-shop.com/'])
  })
})
