import { describe, expect, it } from 'vitest'
import {
  googleClickOf,
  parseGoogleClick,
  serializeGoogleClick,
} from '@/features/analytics/model/google-click'

const GCLID = 'CjwKCAjwl4HXBhAjEiwAHlpWhNjyMOWk-za5vzAl8vnZlt7Az-3T7wmUF1S4bXY1_BwE'
const GBRAID = '0AAAAADoTCVTqK7xVq3bU2kQ_cUTf2zX1h'
const WBRAID = 'CjkKCQiAmfq6BhCaARIoAKaIxBmIpd9-6zDyRNSKcDnX'

describe('the Google Ads click of a landing', () => {
  it('reads the gclid of an ad click', () => {
    const url = new URL(`https://hart-shop.com/product/x/?gad_source=1&gclid=${GCLID}`)

    expect(googleClickOf(url)).toEqual({ kind: 'gclid', id: GCLID })
  })

  it('reads the gbraid or the wbraid an iPhone click carries instead', () => {
    expect(googleClickOf(new URL(`https://hart-shop.com/?gad_source=1&gbraid=${GBRAID}`))).toEqual({
      kind: 'gbraid',
      id: GBRAID,
    })
    expect(googleClickOf(new URL(`https://hart-shop.com/?wbraid=${WBRAID}`))).toEqual({
      kind: 'wbraid',
      id: WBRAID,
    })
  })

  it('keeps the gclid when the landing carries a gbraid as well', () => {
    const url = new URL(`https://hart-shop.com/?gbraid=${GBRAID}&gclid=${GCLID}`)

    expect(googleClickOf(url)).toEqual({ kind: 'gclid', id: GCLID })
  })

  it('is null for a visit without one', () => {
    expect(googleClickOf(new URL('https://hart-shop.com/?gad_source=1'))).toBeNull()
  })
})

describe('the click as the cookie and the order keep it', () => {
  it('keeps a gclid bare and puts the kind in front of a gbraid or a wbraid', () => {
    expect(serializeGoogleClick({ kind: 'gclid', id: GCLID })).toBe(GCLID)
    expect(serializeGoogleClick({ kind: 'gbraid', id: GBRAID })).toBe(`gbraid:${GBRAID}`)
    expect(serializeGoogleClick({ kind: 'wbraid', id: WBRAID })).toBe(`wbraid:${WBRAID}`)
  })

  it('takes a stored click back as it was written', () => {
    expect(parseGoogleClick(GCLID)).toEqual({ kind: 'gclid', id: GCLID })
    expect(parseGoogleClick(`gbraid:${GBRAID}`)).toEqual({ kind: 'gbraid', id: GBRAID })
    expect(parseGoogleClick(`wbraid:${WBRAID}`)).toEqual({ kind: 'wbraid', id: WBRAID })
  })

  it('refuses a value that is no click, so it never reaches the upload file', () => {
    expect(parseGoogleClick('abc,Server purchase,2026-10-27')).toBeNull()
    expect(parseGoogleClick('short')).toBeNull()
    expect(parseGoogleClick(`gclid:${GCLID}`)).toBeNull()
    expect(parseGoogleClick(`fbclid:${GBRAID}`)).toBeNull()
    expect(parseGoogleClick('gbraid:short')).toBeNull()
    expect(parseGoogleClick(undefined)).toBeNull()
  })
})
