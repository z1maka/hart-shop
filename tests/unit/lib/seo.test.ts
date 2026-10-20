import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/env', () => ({
  env: { NEXT_PUBLIC_SITE_URL: 'https://fox-armor.com.ua' },
  enquiryRecipient: 'office@fox-armor.org',
}))

import { createMoney, Currency } from '@/lib/money'
import { productJsonLd, videoJsonLd, type ProductJsonLdInput } from '@/lib/seo'

const PRODUCT_INPUT: ProductJsonLdInput = {
  slug: 'anty-teploviziyna-nakydka-poncho-a6286',
  title: 'Антитепловізійне пончо',
  description: 'Пончо',
  sku: 'FOX-UA-1',
  brand: null,
  isOwnProduction: true,
  price: createMoney(220000, Currency.Uah),
  weightGrams: 900,
  imageUrls: [],
  inStock: true,
  colors: [],
  rating: null,
  reviews: [],
}

const PRODUCT = productJsonLd(PRODUCT_INPUT)

describe('productJsonLd', () => {
  it('names the shop as the brand of its own sewing, made in Ukraine', () => {
    expect(PRODUCT.brand).toEqual({ '@type': 'Brand', name: 'Гарт' })
    expect(PRODUCT.countryOfOrigin).toBe('UA')
  })

  it("names a bought-in product's maker and claims no country for it", () => {
    const bought = productJsonLd({ ...PRODUCT_INPUT, brand: "Walker's", isOwnProduction: false })

    expect(bought.brand).toEqual({ '@type': 'Brand', name: "Walker's" })
    expect(bought).not.toHaveProperty('countryOfOrigin')
  })

  it('names the shop for unbranded bought-in gear, still without a country', () => {
    const unbranded = productJsonLd({ ...PRODUCT_INPUT, isOwnProduction: false })

    expect(unbranded.brand).toEqual({ '@type': 'Brand', name: 'Гарт' })
    expect(unbranded).not.toHaveProperty('countryOfOrigin')
  })

  it('points the offer at the canonical address, trailing slash included', () => {
    // Without the slash a shopping engine checking the offer lands on a redirect.
    const offers = PRODUCT.offers as Record<string, unknown>

    expect(PRODUCT.url).toBe(
      'https://fox-armor.com.ua/product/anty-teploviziyna-nakydka-poncho-a6286/',
    )
    expect(offers.url).toBe(PRODUCT.url)
    expect(offers.price).toBe('2200.00')
    expect(offers.priceCurrency).toBe('UAH')
  })

  it('states the return policy for Ukraine, the country the shop sells in', () => {
    const offers = PRODUCT.offers as { hasMerchantReturnPolicy: Record<string, unknown> }

    expect(offers.hasMerchantReturnPolicy.applicableCountry).toBe('UA')
    expect(offers.hasMerchantReturnPolicy.merchantReturnDays).toBe(14)
  })

  it('states delivery within Ukraine, its timing and the rate for the parcel weight', () => {
    const offers = PRODUCT.offers as {
      shippingDetails: {
        shippingDestination: Record<string, unknown>
        deliveryTime: {
          handlingTime: Record<string, unknown>
          transitTime: Record<string, unknown>
        }
        shippingRate: Record<string, unknown>
      }
    }

    expect(offers.shippingDetails.shippingDestination.addressCountry).toBe('UA')
    expect(offers.shippingDetails.deliveryTime.handlingTime).toMatchObject({
      minValue: 0,
      maxValue: 1,
      unitCode: 'DAY',
    })
    expect(offers.shippingDetails.deliveryTime.transitTime).toMatchObject({
      minValue: 1,
      maxValue: 2,
      unitCode: 'DAY',
    })
    expect(offers.shippingDetails.shippingRate).toEqual({
      '@type': 'MonetaryAmount',
      value: '100.00',
      currency: 'UAH',
    })
  })

  it('states no delivery rate for a product nobody has weighed', () => {
    const unweighed = productJsonLd({ ...PRODUCT_INPUT, weightGrams: 0 })
    const offers = unweighed.offers as { shippingDetails: Record<string, unknown> }

    expect(offers.shippingDetails.shippingRate).toBeUndefined()
    expect(offers.shippingDetails.shippingDestination).toBeDefined()
  })
})

describe('videoJsonLd', () => {
  it('carries what Google requires for a video: name, thumbnail, upload date', () => {
    const video = videoJsonLd({
      name: 'Тест пончо в тепловізорі дрона',
      description: 'Тест пончо в тепловізорі дрона. Пончо Model Multi 1, FOX Armor.',
      thumbnailUrl: 'https://i.ytimg.com/vi/oj3HwvDkAyc/hqdefault.jpg',
      uploadDate: '2024-05-23T22:00:35-07:00',
      duration: 'PT1M36S',
      embedUrl: 'https://www.youtube.com/embed/oj3HwvDkAyc',
    })

    expect(video).toMatchObject({
      '@type': 'VideoObject',
      name: 'Тест пончо в тепловізорі дрона',
      thumbnailUrl: ['https://i.ytimg.com/vi/oj3HwvDkAyc/hqdefault.jpg'],
      uploadDate: '2024-05-23T22:00:35-07:00',
      duration: 'PT1M36S',
      embedUrl: 'https://www.youtube.com/embed/oj3HwvDkAyc',
    })
  })
})
