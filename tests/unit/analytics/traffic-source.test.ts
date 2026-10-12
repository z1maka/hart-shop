import { describe, expect, it } from 'vitest'
import {
  classifyVisit,
  parseTouch,
  serializeTouch,
  shouldReplace,
  touchToKeep,
} from '@/features/analytics/model/traffic-source'

function visit(path: string, referrer = '') {
  return classifyVisit({ url: new URL(`https://fox-armor.com.ua${path}`), referrer })
}

describe('classifyVisit', () => {
  it('reads a Google Ads click by its click id', () => {
    expect(visit('/product/x/?gclid=Cj0KCQjw')).toEqual({ source: 'google_ads', detail: null })
    expect(visit('/?gbraid=0AAAA&utm_campaign=PMax чохли')).toEqual({
      source: 'google_ads',
      detail: 'PMax чохли',
    })
    expect(visit('/?gad_source=1')).toEqual({ source: 'google_ads', detail: null })
  })

  it('does not take a free Shopping listing for an ad', () => {
    expect(visit('/product/x/?gad_source=5', 'https://www.google.com/')).toEqual({
      source: 'search',
      detail: 'www.google.com',
    })
  })

  it('reads a Meta ad by its utm tags, Instagram included', () => {
    expect(
      visit('/?utm_source=ig&utm_medium=paid_social&utm_campaign=Пончо жовтень&fbclid=abc'),
    ).toEqual({ source: 'meta', detail: 'Пончо жовтень' })
    expect(visit('/?utm_source=facebook&utm_medium=cpc')).toEqual({ source: 'meta', detail: null })
  })

  it('counts a Facebook or Instagram link without ad tags as social', () => {
    expect(visit('/?fbclid=IwAR0abc', 'https://l.facebook.com/')).toEqual({
      source: 'social',
      detail: null,
    })
    expect(visit('/?utm_source=instagram&utm_medium=bio')).toEqual({
      source: 'social',
      detail: null,
    })
  })

  it('keeps the tag of any other link', () => {
    expect(visit('/?utm_source=telegram&utm_campaign=oct')).toEqual({
      source: 'tagged',
      detail: 'telegram · oct',
    })
  })

  it('reads a tag that names an organic or referral medium as that channel', () => {
    expect(visit('/?utm_source=google&utm_medium=organic')).toEqual({
      source: 'search',
      detail: 'google',
    })
    expect(visit('/?utm_source=partner.ua&utm_medium=referral')).toEqual({
      source: 'referral',
      detail: 'partner.ua',
    })
  })

  it('reads the channel of an untagged visit from where it came', () => {
    expect(visit('/', 'https://www.google.com.ua/')).toEqual({
      source: 'search',
      detail: 'www.google.com.ua',
    })
    expect(visit('/', 'android-app://com.google.android.googlequicksearchbox/')).toEqual({
      source: 'search',
      detail: 'com.google.android.googlequicksearchbox',
    })
    expect(visit('/', 'https://t.me/')).toEqual({ source: 'social', detail: 't.me' })
    expect(visit('/', 'https://forum.example.ua/thread/1')).toEqual({
      source: 'referral',
      detail: 'forum.example.ua',
    })
  })

  it('counts a typed address, a bookmark or an app with no referrer as direct', () => {
    expect(visit('/')).toEqual({ source: 'direct', detail: null })
    expect(visit('/', 'not a url')).toEqual({ source: 'direct', detail: null })
  })

  it('is no new visit when coming from the shop itself or back from the payment page', () => {
    expect(visit('/cart/', 'https://fox-armor.com.ua/product/x/')).toBeNull()
    expect(visit('/', 'https://old.fox-armor.com.ua/shop/')).toBeNull()
    expect(visit('/', 'https://www.fox-armor.com.ua/')).toBeNull()
    expect(visit('/checkout/return/', 'https://secure.wayforpay.com/pay')).toBeNull()
    expect(visit('/checkout/return/', 'https://pay.monobank.ua/abc')).toBeNull()
  })

  it('drops percent signs and control characters from a campaign', () => {
    expect(visit('/?utm_source=google&utm_medium=cpc&utm_campaign=50%25%0Aoff')?.detail).toBe(
      '50off',
    )
  })
})

describe('shouldReplace', () => {
  const ads = { source: 'google_ads', detail: null } as const
  const direct = { source: 'direct', detail: null } as const

  it('lets the last visit from somewhere win', () => {
    expect(shouldReplace(direct, ads)).toBe(true)
    expect(shouldReplace(ads, { source: 'meta', detail: 'x' })).toBe(true)
  })

  it('does not let a direct visit take the credit from an earlier channel', () => {
    expect(shouldReplace(ads, direct)).toBe(false)
    expect(shouldReplace(null, direct)).toBe(true)
  })
})

describe('the traffic cookie', () => {
  it('carries the channel and a Cyrillic campaign there and back', () => {
    const touch = { source: 'meta', detail: 'Пончо жовтень' } as const

    expect(parseTouch(serializeTouch(touch))).toEqual(touch)
    // The server may hand the value over already decoded.
    expect(parseTouch(decodeURIComponent(serializeTouch(touch)))).toEqual(touch)
  })

  it('carries nothing from a cookie that is not ours', () => {
    expect(parseTouch(undefined)).toBeNull()
    expect(parseTouch('%E0%A4%A')).toBeNull()
    expect(parseTouch(encodeURIComponent('["paid_everything",null]'))).toBeNull()
    expect(parseTouch(encodeURIComponent('{"source":"meta"}'))).toBeNull()
  })
})

describe('touchToKeep — what a page load leaves in the cookie', () => {
  const landing = (path: string, referrer = '') => ({
    url: new URL(`https://fox-armor.com.ua${path}`),
    referrer,
  })

  it('keeps an ad landing', () => {
    expect(touchToKeep(landing('/?gclid=Cj0KCQjw_BwE'), undefined)).toEqual({
      source: 'google_ads',
      detail: null,
    })
  })

  it('leaves an earlier ad in place when the buyer comes back by typing the address', () => {
    const stored = serializeTouch({ source: 'meta', detail: 'Пончо' })

    expect(touchToKeep(landing('/'), stored)).toBeNull()
  })

  it('leaves the cookie alone for a step inside the shop', () => {
    expect(touchToKeep(landing('/cart/', 'https://fox-armor.com.ua/'), undefined)).toBeNull()
  })
})
