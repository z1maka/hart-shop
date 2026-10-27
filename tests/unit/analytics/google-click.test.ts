import { describe, expect, it } from 'vitest'
import { googleClickIdOf, parseGoogleClickId } from '@/features/analytics/model/google-click'

const GCLID = 'CjwKCAjwl4HXBhAjEiwAHlpWhNjyMOWk-za5vzAl8vnZlt7Az-3T7wmUF1S4bXY1_BwE'

describe('the Google Ads click of a landing', () => {
  it('reads the gclid of an ad click', () => {
    const url = new URL(`https://hart-shop.com/product/x/?gad_source=1&gclid=${GCLID}`)

    expect(googleClickIdOf(url)).toBe(GCLID)
  })

  it('is null for a visit without one', () => {
    expect(googleClickIdOf(new URL('https://hart-shop.com/?gad_source=1'))).toBeNull()
  })

  it('refuses a value that is no click id, so it never reaches the upload file', () => {
    expect(parseGoogleClickId('abc,Server purchase,2026-10-27')).toBeNull()
    expect(parseGoogleClickId('short')).toBeNull()
    expect(parseGoogleClickId(undefined)).toBeNull()
  })

  it('takes a stored id back as it was written', () => {
    expect(parseGoogleClickId(GCLID)).toBe(GCLID)
  })
})
