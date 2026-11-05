import { describe, expect, it } from 'vitest'
import { SalesChannel } from '@/db/enums'
import {
  isSalesChannel,
  linePricingFor,
  listedUnitPriceCents,
  writesToRecipient,
} from '@/features/orders/model/channel-pricing'
import { isWholeHryvniaPrice, partnerUnitPriceCents } from '@/features/orders/model/dropship-order'

// FX14 multicam: 4 400 ₴ retail, 3 900 ₴ from 10, 3 550 ₴ to a partner.
const PONCHO = {
  priceCents: 440_000,
  salePriceCents: null,
  wholesale: { minQuantity: 10, priceCents: 390_000 },
  dropPriceCents: 355_000,
}

describe('linePricingFor', () => {
  it('prices a site order as the cart does, wholesale tier included', () => {
    const site = linePricingFor(SalesChannel.Site)
    expect(site(PONCHO, 1)).toBe(440_000)
    expect(site(PONCHO, 10)).toBe(390_000)
  })

  it('prices a partner order at the drop price whatever the quantity', () => {
    const dropship = linePricingFor(SalesChannel.Dropship)
    expect(dropship(PONCHO, 1)).toBe(355_000)
    expect(dropship(PONCHO, 10)).toBe(355_000)
  })

  it('cannot price a partner order without a drop price', () => {
    expect(linePricingFor(SalesChannel.Dropship)({ ...PONCHO, dropPriceCents: null }, 2)).toBeNull()
  })
})

describe('listedUnitPriceCents', () => {
  const prices = { retailCents: 450_000, dropCents: 365_000 }

  it('lists the price the order of that channel will charge', () => {
    expect(listedUnitPriceCents(SalesChannel.Site, prices)).toBe(450_000)
    expect(listedUnitPriceCents(SalesChannel.Dropship, prices)).toBe(365_000)
    expect(listedUnitPriceCents(SalesChannel.Dropship, { ...prices, dropCents: null })).toBeNull()
  })
})

describe('channels', () => {
  it('knows its channels', () => {
    expect(isSalesChannel('dropship')).toBe(true)
    expect(isSalesChannel('phone')).toBe(false)
  })

  it('writes only to the site’s own buyers', () => {
    expect(writesToRecipient(SalesChannel.Site)).toBe(true)
    expect(writesToRecipient(SalesChannel.Dropship)).toBe(false)
  })
})

describe('partner prices', () => {
  it('takes the card’s drop price with the variant’s surcharge', () => {
    expect(partnerUnitPriceCents({ dropPriceCents: 355_000, priceDeltaCents: 10_000 }, null)).toBe(
      365_000,
    )
  })

  it('takes a price agreed apart from the card over it', () => {
    expect(partnerUnitPriceCents({ dropPriceCents: 355_000, priceDeltaCents: 0 }, 300_000)).toBe(
      300_000,
    )
    expect(partnerUnitPriceCents({ dropPriceCents: null, priceDeltaCents: 0 }, 300_000)).toBe(
      300_000,
    )
  })

  it('has no price without a drop price or an agreed one', () => {
    expect(partnerUnitPriceCents({ dropPriceCents: null, priceDeltaCents: 0 }, null)).toBeNull()
  })

  it('takes an agreed price in whole hryvnias only', () => {
    expect(isWholeHryvniaPrice(355_000)).toBe(true)
    expect(isWholeHryvniaPrice(355_050)).toBe(false)
    expect(isWholeHryvniaPrice(0)).toBe(false)
    expect(isWholeHryvniaPrice(1.5)).toBe(false)
  })
})
