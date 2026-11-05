import { describe, expect, it } from 'vitest'
import { OrderStatus, PaymentRoute } from '@/db/enums'
import {
  addBankingDays,
  DEFAULT_VALIDITY_BANKING_DAYS,
  dottedDate,
  InvoiceBlock,
  invoiceBlockOf,
  invoiceLineName,
  invoiceOrderReference,
  invoiceTotalCents,
  paymentPurposeText,
  signatoryOf,
} from '@/features/invoices/model/invoice'

const LINES = [
  { sku: '3600-2-MULTICAM', name: 'Пончо FX14, мультикам', quantity: 2, unitPriceCents: 355_000 },
  { sku: 'FX-SL-M', name: 'Чохол Starlink Mini', quantity: 1, unitPriceCents: 190_050 },
]

describe('invoice sums', () => {
  it('adds the lines up to the kopiyka', () => {
    expect(invoiceTotalCents(LINES)).toBe(900_050)
    expect(invoiceTotalCents([])).toBe(0)
  })

  it('names a line by product and variant', () => {
    expect(invoiceLineName('Пончо FX14', 'мультикам')).toBe('Пончо FX14, мультикам')
    expect(invoiceLineName('Кавер на шолом', '')).toBe('Кавер на шолом')
  })
})

describe('payment purpose', () => {
  it('quotes the partner’s own order number when there is one', () => {
    const reference = invoiceOrderReference({
      orderNumber: 'HART-2026-000046',
      resellerOrderRef: '31805',
    })
    expect(
      paymentPurposeText({ orderReference: reference, number: 343, issuedOn: '2026-11-05' }),
    ).toBe('Оплата за замовлення 31805 згідно з рахунком № 343 від 05.11.2026, без ПДВ')
  })

  it('falls back to the shop’s number for a site order', () => {
    expect(invoiceOrderReference({ orderNumber: 'HART-2026-000046', resellerOrderRef: null })).toBe(
      'HART-2026-000046',
    )
  })

  it('writes the date with dots', () => {
    expect(dottedDate('2026-01-09')).toBe('09.01.2026')
  })
})

describe('validity', () => {
  it('runs five banking days from Thursday to the next Thursday', () => {
    expect(addBankingDays('2026-11-05', DEFAULT_VALIDITY_BANKING_DAYS)).toBe('2026-11-12')
  })

  it('skips the weekend from a Friday or a Saturday', () => {
    expect(addBankingDays('2026-11-06', 1)).toBe('2026-11-09')
    expect(addBankingDays('2026-11-07', 1)).toBe('2026-11-09')
    expect(addBankingDays('2026-11-06', 5)).toBe('2026-11-13')
  })

  it('stays on the day for zero days', () => {
    expect(addBankingDays('2026-11-05', 0)).toBe('2026-11-05')
  })
})

describe('invoiceBlockOf', () => {
  it('takes an open order paid by transfer', () => {
    expect(
      invoiceBlockOf({ paymentRoute: PaymentRoute.BankTransfer, status: OrderStatus.Pending }),
    ).toBeNull()
    expect(
      invoiceBlockOf({ paymentRoute: PaymentRoute.BankTransfer, status: OrderStatus.Shipped }),
    ).toBeNull()
  })

  it('refuses another route or a closed order', () => {
    expect(
      invoiceBlockOf({ paymentRoute: PaymentRoute.CashOnDelivery, status: OrderStatus.Pending }),
    ).toBe(InvoiceBlock.NotTransfer)
    expect(
      invoiceBlockOf({ paymentRoute: PaymentRoute.BankTransfer, status: OrderStatus.Cancelled }),
    ).toBe(InvoiceBlock.Closed)
    expect(
      invoiceBlockOf({ paymentRoute: PaymentRoute.BankTransfer, status: OrderStatus.Refunded }),
    ).toBe(InvoiceBlock.Closed)
  })
})

describe('signatoryOf', () => {
  it('shortens a ФОП to surname and initials', () => {
    expect(signatoryOf('ФОП Масний Олександр Сергійович')).toBe('ФОП Масний О. С.')
  })

  it('keeps any other name as it is', () => {
    expect(signatoryOf('ТОВ «Гарт»')).toBe('ТОВ «Гарт»')
    expect(signatoryOf('ФОП Масний Олександр')).toBe('ФОП Масний Олександр')
  })
})
