import { describe, expect, it } from 'vitest'
import { OrderStatus, PaymentRoute, SalesChannel } from '@/db/enums'
import {
  googleAdsPushWindow,
  isGoogleAdsSale,
  toDataManagerSaleEvent,
  toGoogleAdsConversionsCsv,
  type GoogleAdsSaleCandidate,
} from '@/features/orders/model/google-ads-conversions'

const SALE: GoogleAdsSaleCandidate = {
  orderNumber: 'HART-2026-000023',
  googleClickId: 'CjwKCAjwl4HXBhAjEiwAHlpWhNjyMOWk',
  createdAt: new Date('2026-10-27T13:11:22.901Z'),
  totalCents: 1_450_000,
  currency: 'UAH',
  status: OrderStatus.Pending,
  paymentRoute: PaymentRoute.CashOnDelivery,
  channel: SalesChannel.Site,
  paidAt: null,
}

describe('which orders go to Google Ads as sales', () => {
  it('counts a cash-on-delivery order once it is placed', () => {
    expect(isGoogleAdsSale(SALE)).toBe(true)
  })

  it('leaves out a cancelled or refunded order', () => {
    expect(isGoogleAdsSale({ ...SALE, status: OrderStatus.Cancelled })).toBe(false)
    expect(isGoogleAdsSale({ ...SALE, status: OrderStatus.Refunded })).toBe(false)
  })

  it('waits for a card order to be paid', () => {
    const card = { ...SALE, paymentRoute: PaymentRoute.Card }

    expect(isGoogleAdsSale(card)).toBe(false)
    expect(isGoogleAdsSale({ ...card, paidAt: new Date('2026-10-27T13:15:00Z') })).toBe(true)
  })
})

describe('the upload file', () => {
  const HEADER =
    'Google Click ID,GBRAID,WBRAID,Conversion Name,Conversion Time,Conversion Value,Conversion Currency,Order ID,Ad User Data,Ad Personalization,Event Source'

  it('names the click, the action, the UTC time, the value and the order', () => {
    expect(toGoogleAdsConversionsCsv([SALE], 'Server purchase')).toBe(
      [
        HEADER,
        'CjwKCAjwl4HXBhAjEiwAHlpWhNjyMOWk,,,Server purchase,2026-10-27 13:11:22+00:00,14500.00,UAH,HART-2026-000023,Granted,Granted,WEB',
        '',
      ].join('\n'),
    )
  })

  it('puts an iPhone click in the column of its kind', () => {
    const gbraid = { ...SALE, googleClickId: 'gbraid:0AAAAADoTCVTqK7xVq3bU2kQ_cUTf2zX1h' }
    const wbraid = { ...SALE, googleClickId: 'wbraid:CjkKCQiAmfq6BhCaARIoAKaIxBmIpd9-6zDyRNSKcDnX' }

    const [, gbraidRow, wbraidRow] = toGoogleAdsConversionsCsv([gbraid, wbraid], 'Server purchase').split('\n')

    expect(gbraidRow).toMatch(/^,0AAAAADoTCVTqK7xVq3bU2kQ_cUTf2zX1h,,Server purchase,/)
    expect(wbraidRow).toMatch(/^,,CjkKCQiAmfq6BhCaARIoAKaIxBmIpd9-6zDyRNSKcDnX,Server purchase,/)
  })

  it('leaves out an order whose stored click is not one', () => {
    const broken = { ...SALE, googleClickId: 'gclid:not,a,click' }

    expect(toGoogleAdsConversionsCsv([broken], 'Server purchase')).toBe(`${HEADER}\n`)
  })

  it('starts with the header, which Data Manager maps the columns by', () => {
    expect(toGoogleAdsConversionsCsv([], 'Server purchase').split('\n')[0]).toMatch(
      /^Google Click ID,/,
    )
  })
})

describe('partner orders', () => {
  it('never reports a partner order to Google Ads, click or not', () => {
    expect(isGoogleAdsSale({ ...SALE, channel: SalesChannel.Dropship })).toBe(false)
  })
})

describe('the Data Manager event', () => {
  it('carries the same click, time, value and order number as the CSV row', () => {
    expect(toDataManagerSaleEvent(SALE)).toEqual({
      adIdentifiers: { gclid: 'CjwKCAjwl4HXBhAjEiwAHlpWhNjyMOWk' },
      eventTimestamp: '2026-10-27T13:11:22.901Z',
      transactionId: 'HART-2026-000023',
      conversionValue: 14_500,
      currency: 'UAH',
      eventSource: 'WEB',
      consent: { adUserData: 'CONSENT_GRANTED', adPersonalization: 'CONSENT_GRANTED' },
    })
  })

  it('names an iPhone click by its own kind', () => {
    const gbraid = { ...SALE, googleClickId: 'gbraid:0AAAAADoTCVTqK7xVq3bU2kQ_cUTf2zX1h' }
    const wbraid = { ...SALE, googleClickId: 'wbraid:CjkKCQiAmfq6BhCaARIoAKaIxBmIpd9-6zDyRNSKcDnX' }

    expect(toDataManagerSaleEvent(gbraid)?.adIdentifiers).toEqual({
      gbraid: '0AAAAADoTCVTqK7xVq3bU2kQ_cUTf2zX1h',
    })
    expect(toDataManagerSaleEvent(wbraid)?.adIdentifiers).toEqual({
      wbraid: 'CjkKCQiAmfq6BhCaARIoAKaIxBmIpd9-6zDyRNSKcDnX',
    })
  })

  it('keeps kopiykas of an odd total', () => {
    expect(toDataManagerSaleEvent({ ...SALE, totalCents: 289_950 })?.conversionValue).toBe(2_899.5)
  })

  it('leaves out an order whose stored click is not one', () => {
    expect(toDataManagerSaleEvent({ ...SALE, googleClickId: 'gclid:not,a,click' })).toBeNull()
  })
})

describe('which orders an hourly push reports', () => {
  // November: Kyiv is UTC+2.
  it('takes the hour that just turned six hours old, plus the overlap', () => {
    expect(googleAdsPushWindow(new Date('2026-11-11T12:05:00Z'))).toEqual({
      from: new Date('2026-11-11T04:35:00Z'),
      to: new Date('2026-11-11T06:05:00Z'),
    })
  })

  it('reaches back to the last evening run on the first morning one', () => {
    // 08:05 in Kyiv; the previous run was at 22:05, before the quiet hours.
    expect(googleAdsPushWindow(new Date('2026-11-12T06:05:00Z'))).toEqual({
      from: new Date('2026-11-11T13:35:00Z'),
      to: new Date('2026-11-12T00:05:00Z'),
    })
  })

  it('leaves no gap between one run and the next', () => {
    const earlier = googleAdsPushWindow(new Date('2026-11-11T11:05:00Z'))
    const later = googleAdsPushWindow(new Date('2026-11-11T12:07:00Z'))

    expect(later.from.getTime()).toBeLessThan(earlier.to.getTime())
  })

  it('keeps the night continuous when the clock goes back', () => {
    // 25.10.2026, Kyiv leaves summer time at 04:00 (01:00 UTC). The last
    // evening run was at 22:05 summer time, 19:05 UTC.
    const evening = googleAdsPushWindow(new Date('2026-10-24T19:05:00Z'))
    const morning = googleAdsPushWindow(new Date('2026-10-25T06:05:00Z'))

    expect(morning.from).toEqual(new Date('2026-10-24T12:35:00Z'))
    expect(morning.from.getTime()).toBeLessThan(evening.to.getTime())
  })

  it('never reports an order younger than six hours', () => {
    const now = new Date('2026-11-11T12:05:00Z')

    expect(now.getTime() - googleAdsPushWindow(now).to.getTime()).toBe(6 * 60 * 60 * 1000)
  })
})
