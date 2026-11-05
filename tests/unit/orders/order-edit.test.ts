import { describe, expect, it } from 'vitest'
import { OrderStatus, PaymentRoute, SalesChannel } from '@/db/enums'
import {
  lineRepricingFor,
  linesSubtotalCents,
  OrderEditBlock,
  orderEditBlockOf,
  priceQueryCents,
  repricedLines,
  stockChanges,
  type EditLine,
} from '@/features/orders/model/order-edit'
import { unitPriceCentsFor } from '@/features/catalog/model/pricing'

const OPEN_COD_ORDER = {
  status: OrderStatus.Pending,
  paymentRoute: PaymentRoute.CashOnDelivery,
  paidAt: null,
  carrierDocumentRef: null,
  trackingNumber: null,
}

// The self-cooling 3D cover: 2 900 ₴, 2 700 ₴ from 10.
const COVER_PRICING = {
  priceCents: 290000,
  salePriceCents: null,
  wholesale: { minQuantity: 10, priceCents: 270000 },
}
const PONCHO_PRICING = { priceCents: 220000, salePriceCents: null, wholesale: null }

const pricingOf = (productId: string) => (productId === 'cover' ? COVER_PRICING : PONCHO_PRICING)
const unitPriceOf = (productId: string, quantity: number) =>
  unitPriceCentsFor(pricingOf(productId), quantity)

function line(overrides: Partial<EditLine> & Pick<EditLine, 'variantId'>): EditLine {
  return {
    productId: 'cover',
    priceDeltaCents: 0,
    quantity: 1,
    unitPriceCents: 290000,
    ...overrides,
  }
}

describe('orderEditBlockOf', () => {
  it('lets an open cash-on-delivery order be edited, packed or not', () => {
    expect(orderEditBlockOf(OPEN_COD_ORDER)).toBeNull()
    expect(orderEditBlockOf({ ...OPEN_COD_ORDER, status: OrderStatus.Packed })).toBeNull()
  })

  it('closes a shipped or cancelled order', () => {
    expect(orderEditBlockOf({ ...OPEN_COD_ORDER, status: OrderStatus.Shipped })).toBe(
      OrderEditBlock.Closed,
    )
    expect(orderEditBlockOf({ ...OPEN_COD_ORDER, status: OrderStatus.Cancelled })).toBe(
      OrderEditBlock.Closed,
    )
  })

  it('waits for the waybill to be removed', () => {
    expect(orderEditBlockOf({ ...OPEN_COD_ORDER, carrierDocumentRef: 'ref' })).toBe(
      OrderEditBlock.Waybill,
    )
    expect(orderEditBlockOf({ ...OPEN_COD_ORDER, trackingNumber: '20451539698513' })).toBe(
      OrderEditBlock.Waybill,
    )
  })

  it('leaves card orders alone', () => {
    expect(orderEditBlockOf({ ...OPEN_COD_ORDER, paymentRoute: PaymentRoute.Card })).toBe(
      OrderEditBlock.Card,
    )
  })

  it('edits a transfer only before the money arrives', () => {
    const transfer = { ...OPEN_COD_ORDER, paymentRoute: PaymentRoute.BankTransfer }

    expect(orderEditBlockOf(transfer)).toBeNull()
    expect(
      orderEditBlockOf({ ...transfer, status: OrderStatus.Paid, paidAt: new Date('2026-11-03') }),
    ).toBe(OrderEditBlock.Paid)
  })
})

describe('repricedLines', () => {
  it('reaches the wholesale price for every colour once the product crosses the tier', () => {
    const before = [
      line({ variantId: 'multicam', quantity: 6 }),
      line({ variantId: 'pixel', quantity: 3 }),
    ]
    const after = [
      line({ variantId: 'multicam', quantity: 7 }),
      line({ variantId: 'pixel', quantity: 3 }),
    ]

    expect(repricedLines(before, after, unitPriceOf).map((entry) => entry.unitPriceCents)).toEqual([
      270000, 270000,
    ])
  })

  it('drops back to the single-unit price below the tier', () => {
    const before = [line({ variantId: 'multicam', quantity: 10, unitPriceCents: 270000 })]
    const after = [line({ variantId: 'multicam', quantity: 8, unitPriceCents: 270000 })]

    expect(repricedLines(before, after, unitPriceOf)[0]?.unitPriceCents).toBe(290000)
  })

  it('keeps the agreed price of a product whose quantity did not change', () => {
    const before = [
      line({ variantId: 'multicam', quantity: 3 }),
      line({ variantId: 'olive', productId: 'poncho', quantity: 1, unitPriceCents: 210000 }),
    ]
    const after = [
      line({ variantId: 'multicam', quantity: 4 }),
      line({ variantId: 'olive', productId: 'poncho', quantity: 1, unitPriceCents: 210000 }),
    ]

    expect(repricedLines(before, after, unitPriceOf)[1]?.unitPriceCents).toBe(210000)
  })

  it('prices a new line with its variant surcharge and drops removed ones', () => {
    const before = [line({ variantId: 'multicam', quantity: 1 })]
    const after = [
      line({ variantId: 'multicam', quantity: 0 }),
      line({ variantId: 'gen3', quantity: 2, priceDeltaCents: 10000, unitPriceCents: 0 }),
    ]

    expect(repricedLines(before, after, unitPriceOf)).toEqual([
      line({ variantId: 'gen3', quantity: 2, priceDeltaCents: 10000, unitPriceCents: 300000 }),
    ])
  })
})

describe('stockChanges', () => {
  it('takes the added units off the shelf and returns the removed ones', () => {
    const before = [
      line({ variantId: 'multicam', quantity: 3 }),
      line({ variantId: 'pixel', quantity: 2 }),
      line({ variantId: 'olive', quantity: 1 }),
    ]
    const after = [
      line({ variantId: 'multicam', quantity: 4 }),
      line({ variantId: 'pixel', quantity: 0 }),
      line({ variantId: 'olive', quantity: 1 }),
      line({ variantId: 'winter', quantity: 2 }),
    ]

    expect(stockChanges(before, after)).toEqual(
      new Map([
        ['multicam', 1],
        ['pixel', -2],
        ['winter', 2],
      ]),
    )
  })
})

describe('linesSubtotalCents', () => {
  it('adds up unit price times quantity', () => {
    expect(
      linesSubtotalCents([
        { quantity: 4, unitPriceCents: 290000 },
        { quantity: 1, unitPriceCents: 220000 },
      ]),
    ).toBe(1380000)
  })
})

describe('the lines of a partner order', () => {
  // A partner pays the drop price, whatever the quantity: 3 550 ₴.
  const dropPrice = () => 355_000
  const repriced = lineRepricingFor(SalesChannel.Dropship)

  it('keeps the drop price on a line whose quantity grew, never the wholesale one', () => {
    const before = [line({ variantId: 'cover-olive', quantity: 2, unitPriceCents: 355_000 })]
    const after = [line({ variantId: 'cover-olive', quantity: 12, unitPriceCents: 355_000 })]

    expect(repriced(before, after, dropPrice)[0]?.unitPriceCents).toBe(355_000)
  })

  it('keeps an agreed price when the line’s quantity changes', () => {
    const before = [line({ variantId: 'cover-olive', quantity: 2, unitPriceCents: 300_000 })]
    const after = [line({ variantId: 'cover-olive', quantity: 3, unitPriceCents: 300_000 })]

    expect(repriced(before, after, dropPrice)[0]?.unitPriceCents).toBe(300_000)
  })

  it('prices only a variant new to the order, a new colour of the same product too', () => {
    const agreed = line({ variantId: 'cover-olive', quantity: 2, unitPriceCents: 300_000 })
    const colour = line({ variantId: 'cover-pixel', quantity: 1, unitPriceCents: 0 })
    const poncho = line({
      variantId: 'poncho',
      productId: 'poncho',
      quantity: 1,
      unitPriceCents: 0,
    })

    expect(
      repriced([agreed], [agreed, colour, poncho], dropPrice).map((entry) => entry.unitPriceCents),
    ).toEqual([300_000, 355_000, 355_000])
  })

  it('drops a line taken down to zero', () => {
    const cover = line({ variantId: 'cover-olive', quantity: 2, unitPriceCents: 300_000 })

    expect(repriced([cover], [{ ...cover, quantity: 0 }], dropPrice)).toEqual([])
  })
})

describe('priceQueryCents', () => {
  it('reads whole hryvnias typed bare, grouped or with the sign', () => {
    expect(priceQueryCents('3550')).toBe(355_000)
    expect(priceQueryCents(' 3 550 ')).toBe(355_000)
    expect(priceQueryCents('3\u202f550 ₴')).toBe(355_000)
    expect(priceQueryCents('870 грн')).toBe(87_000)
  })

  it('leaves names, SKUs and nonsense to the text search', () => {
    expect(priceQueryCents('пончо')).toBeNull()
    expect(priceQueryCents('3600-2-MULTICAM')).toBeNull()
    expect(priceQueryCents('0')).toBeNull()
    expect(priceQueryCents('99999999')).toBeNull()
  })
})
