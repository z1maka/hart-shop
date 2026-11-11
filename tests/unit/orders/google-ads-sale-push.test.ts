import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  isConfigured: vi.fn(),
  ingest: vi.fn(),
  listCandidates: vi.fn(),
}))

vi.mock('@/lib/google-data-manager', () => ({
  isDataManagerConfigured: mocks.isConfigured,
  ingestConversionEvents: mocks.ingest,
}))
vi.mock('@/features/orders/repository/order-repository', () => ({
  orderRepository: { listGoogleAdsSaleCandidates: mocks.listCandidates },
}))

import { OrderStatus, PaymentRoute, SalesChannel } from '@/db/enums'
import type { GoogleAdsSaleCandidate } from '@/features/orders/model/google-ads-conversions'
import { googleAdsSalePush } from '@/features/orders/services/google-ads-sale-push'

// 14:05 in Kyiv.
const NOW = new Date('2026-11-11T12:05:00Z')

const COD_SALE: GoogleAdsSaleCandidate = {
  orderNumber: 'HART-2026-000081',
  googleClickId: 'CjwKCAjwl4HXBhAjEiwAHlpWhNjyMOWk',
  createdAt: new Date('2026-11-11T05:30:00Z'),
  totalCents: 290_000,
  currency: 'UAH',
  status: OrderStatus.Pending,
  paymentRoute: PaymentRoute.CashOnDelivery,
  channel: SalesChannel.Site,
  paidAt: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.isConfigured.mockReturnValue(true)
  mocks.listCandidates.mockResolvedValue([])
  mocks.ingest.mockResolvedValue('request-1')
})

describe('googleAdsSalePush.pushDueSales', () => {
  it('stays off until the Data Manager settings exist', async () => {
    mocks.isConfigured.mockReturnValue(false)

    await expect(googleAdsSalePush.pushDueSales(NOW)).resolves.toMatchObject({
      isConfigured: false,
      sent: [],
    })
    expect(mocks.listCandidates).not.toHaveBeenCalled()
    expect(mocks.ingest).not.toHaveBeenCalled()
  })

  it('reads only the orders that turned six hours old since the last run', async () => {
    await googleAdsSalePush.pushDueSales(NOW)

    expect(mocks.listCandidates).toHaveBeenCalledWith(
      new Date('2026-11-11T04:35:00Z'),
      new Date('2026-11-11T06:05:00Z'),
    )
  })

  it('sends the sales in one request and reports their numbers', async () => {
    const paidCard = {
      ...COD_SALE,
      orderNumber: 'HART-2026-000082',
      paymentRoute: PaymentRoute.Card,
      paidAt: new Date('2026-11-11T05:40:00Z'),
    }
    mocks.listCandidates.mockResolvedValue([COD_SALE, paidCard])

    await expect(googleAdsSalePush.pushDueSales(NOW)).resolves.toMatchObject({
      isConfigured: true,
      sent: ['HART-2026-000081', 'HART-2026-000082'],
      requestId: 'request-1',
    })
    expect(mocks.ingest).toHaveBeenCalledTimes(1)
    expect(mocks.ingest.mock.calls[0]?.[0]).toHaveLength(2)
  })

  it('leaves out what is not a sale or has no readable click', async () => {
    mocks.listCandidates.mockResolvedValue([
      { ...COD_SALE, orderNumber: 'HART-2026-000090', status: OrderStatus.Cancelled },
      { ...COD_SALE, orderNumber: 'HART-2026-000091', paymentRoute: PaymentRoute.Card },
      { ...COD_SALE, orderNumber: 'HART-2026-000092', googleClickId: 'gclid:not,a,click' },
      COD_SALE,
    ])

    await expect(googleAdsSalePush.pushDueSales(NOW)).resolves.toMatchObject({
      sent: ['HART-2026-000081'],
    })
  })

  it('sends nothing when no sale is due', async () => {
    await expect(googleAdsSalePush.pushDueSales(NOW)).resolves.toMatchObject({
      sent: [],
      requestId: null,
    })
    expect(mocks.ingest).not.toHaveBeenCalled()
  })

  it('lets a refusal reach the cron log', async () => {
    mocks.listCandidates.mockResolvedValue([COD_SALE])
    mocks.ingest.mockRejectedValue(new Error('Google API: datamanager.googleapis.com answered 403'))

    await expect(googleAdsSalePush.pushDueSales(NOW)).rejects.toThrow('answered 403')
  })
})

describe('the push schedule', () => {
  // The window of each run assumes the previous one ran an hour earlier.
  it('runs every hour in vercel.json, as the window assumes', () => {
    const config = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
      crons: { path: string; schedule: string }[]
    }

    expect(
      config.crons.find((cron) => cron.path === '/api/cron/google-ads-sales/')?.schedule,
    ).toMatch(/^\d{1,2} \* \* \* \*$/)
  })
})
