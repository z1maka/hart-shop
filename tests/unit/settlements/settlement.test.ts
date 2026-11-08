import { describe, expect, it } from 'vitest'
import { PaymentRoute, SettlementLineKind } from '@/db/enums'
import {
  codFeeCents,
  codFeeLabel,
  collectedOnDeliveryCents,
  hasWorkshopPrice,
  hryvniasToCents,
  isSettlementPeriod,
  itemsLabelOf,
  percentToBasisPoints,
  returnLineOf,
  saleLineOf,
  settlementTotalCents,
  workshopEarningsCents,
  workshopShareOf,
  type SettlementOrder,
} from '@/features/settlements/model/settlement'

const FEE = { basisPoints: 200, fixedCents: 2000 }

const COD_ORDER: SettlementOrder = {
  id: '00000000-0000-4000-8000-000000000001',
  orderNumber: 'HART-2026-000057',
  paymentRoute: PaymentRoute.CashOnDelivery,
  totalCents: 520_000,
  prepaidCents: 0,
  trackingNumber: '20451234567890',
  lines: [
    {
      productTitle: 'Антитепловізійне пончо, 3 шари',
      variantLabel: 'олива',
      quantity: 2,
      unitPriceCents: 220_000,
      unitCostCents: 170_000,
      unitProductionCostCents: 105_000,
    },
    {
      productTitle: 'Тент 250 × 150 см',
      variantLabel: '',
      quantity: 1,
      unitPriceCents: 80_000,
      unitCostCents: 60_000,
      unitProductionCostCents: 30_000,
    },
  ],
}

describe('codFeeCents', () => {
  it('takes the share of the collected sum and the fixed part', () => {
    expect(codFeeCents(520_000, FEE)).toBe(10_400 + 2000)
  })

  it('takes nothing when the carrier collected nothing', () => {
    expect(codFeeCents(0, FEE)).toBe(0)
  })

  it('rounds the share to a whole kopiyka', () => {
    expect(codFeeCents(333, { basisPoints: 150, fixedCents: 0 })).toBe(5)
  })
})

describe('fee input', () => {
  it('reads a percent with a comma or a dot', () => {
    expect(percentToBasisPoints('2')).toBe(200)
    expect(percentToBasisPoints('1,5')).toBe(150)
    expect(percentToBasisPoints('0.75')).toBe(75)
  })

  it('refuses what is not a percent', () => {
    expect(percentToBasisPoints('')).toBeNull()
    expect(percentToBasisPoints('-1')).toBeNull()
    expect(percentToBasisPoints('2 %')).toBeNull()
    expect(percentToBasisPoints('100')).toBeNull()
  })

  it('reads hryvnias with kopiyky', () => {
    expect(hryvniasToCents('20')).toBe(2000)
    expect(hryvniasToCents('15,50')).toBe(1550)
    expect(hryvniasToCents('abc')).toBeNull()
  })

  it('writes the rate back as the admin typed it', () => {
    expect(codFeeLabel({ basisPoints: 150, fixedCents: 1550 })).toBe('1,5 % + 15,5 ₴')
  })
})

describe('collectedOnDeliveryCents', () => {
  it('is the order less the prepayment for cash on delivery', () => {
    expect(collectedOnDeliveryCents({ ...COD_ORDER, prepaidCents: 20_000 })).toBe(500_000)
  })

  it('is nothing for an order paid by card or transfer', () => {
    expect(collectedOnDeliveryCents({ ...COD_ORDER, paymentRoute: PaymentRoute.Card })).toBe(0)
    expect(
      collectedOnDeliveryCents({ ...COD_ORDER, paymentRoute: PaymentRoute.BankTransfer }),
    ).toBe(0)
  })
})

describe('saleLineOf', () => {
  it('owes the shop the sale less the workshop price less the fee', () => {
    const line = saleLineOf(COD_ORDER, FEE)

    expect(line).toEqual({
      orderId: COD_ORDER.id,
      kind: SettlementLineKind.Sale,
      orderNumber: 'HART-2026-000057',
      itemsLabel: '2 × Антитепловізійне пончо, 3 шари, олива; 1 × Тент 250 × 150 см',
      trackingNumber: '20451234567890',
      saleCents: 520_000,
      costCents: 400_000,
      productionCostCents: 240_000,
      codFeeCents: 12_400,
      amountCents: 107_600,
    })
  })

  it("leaves the workshop's cost unknown when an item has none entered", () => {
    const order: SettlementOrder = {
      ...COD_ORDER,
      lines: COD_ORDER.lines.map((line, index) =>
        index === 1 ? { ...line, unitProductionCostCents: null } : line,
      ),
    }

    const line = saleLineOf(order, FEE)

    expect(line?.productionCostCents).toBeNull()
    expect(line?.amountCents).toBe(107_600)
  })

  it('takes no fee from an order paid by transfer', () => {
    const line = saleLineOf({ ...COD_ORDER, paymentRoute: PaymentRoute.BankTransfer }, FEE)

    expect(line?.codFeeCents).toBe(0)
    expect(line?.amountCents).toBe(120_000)
  })

  it('leaves out an order without the workshop price', () => {
    const order = {
      ...COD_ORDER,
      lines: [{ ...COD_ORDER.lines[0], unitCostCents: null }],
    } as SettlementOrder

    expect(hasWorkshopPrice(order)).toBe(false)
    expect(saleLineOf(order, FEE)).toBeNull()
  })
})

describe('returnLineOf', () => {
  it('gives the difference back and keeps the fee spent', () => {
    const sale = saleLineOf(COD_ORDER, FEE)
    if (!sale) throw new Error('expected a sale line')

    const back = returnLineOf(sale)

    expect(back.kind).toBe(SettlementLineKind.Return)
    expect(back.saleCents).toBe(-520_000)
    expect(back.costCents).toBe(-400_000)
    expect(back.codFeeCents).toBe(0)
    expect(back.amountCents).toBe(-120_000)
    expect(back.productionCostCents).toBe(-240_000)
    expect(settlementTotalCents([sale, back])).toBe(-12_400)
  })
})

describe("the workshop's share", () => {
  it('earns its price less the sewing cost', () => {
    expect(workshopEarningsCents({ costCents: 170_000, productionCostCents: 80_000 })).toBe(90_000)
    expect(workshopEarningsCents({ costCents: 170_000, productionCostCents: null })).toBeNull()
  })

  it('keeps its price on every line and counts earnings where the cost is known', () => {
    const share = workshopShareOf([
      { costCents: 170_000, productionCostCents: 80_000 },
      { costCents: 140_000, productionCostCents: 50_000 },
      { costCents: 28_000, productionCostCents: null },
    ])

    expect(share).toEqual({
      keptCents: 338_000,
      productionCostCents: 130_000,
      earningsCents: 180_000,
      uncountedLines: 1,
    })
  })

  it('takes a returned sale off again', () => {
    const sale = saleLineOf(COD_ORDER, FEE)
    if (!sale) throw new Error('expected a sale line')

    expect(workshopShareOf([sale, returnLineOf(sale)])).toMatchObject({
      keptCents: 0,
      productionCostCents: 0,
      earningsCents: 0,
    })
  })
})

describe('itemsLabelOf', () => {
  it('names a line without a variant by the product alone', () => {
    expect(itemsLabelOf([COD_ORDER.lines[1]].filter((line) => line !== undefined))).toBe(
      '1 × Тент 250 × 150 см',
    )
  })
})

describe('isSettlementPeriod', () => {
  it('takes a range of up to a year', () => {
    expect(isSettlementPeriod('2026-10-01', '2026-10-31')).toBe(true)
    expect(isSettlementPeriod('2026-11-07', '2026-11-07')).toBe(true)
    expect(isSettlementPeriod('2026-01-01', '2026-12-31')).toBe(true)
  })

  it('refuses a reversed or longer range', () => {
    expect(isSettlementPeriod('2026-11-02', '2026-11-01')).toBe(false)
    expect(isSettlementPeriod('2025-01-01', '2026-01-02')).toBe(false)
  })
})
