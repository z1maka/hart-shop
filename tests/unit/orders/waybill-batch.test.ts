import { describe, expect, it } from 'vitest'
import { WaybillReadiness } from '@/features/orders/model/shipment'
import type { WaybillBatchOutcome } from '@/features/orders/services/order-shipment-service'

// The panel reads outcomes by `kind`; these are the three shapes it must
// handle, and the type itself refuses anything else.
describe('WaybillBatchOutcome', () => {
  const outcomes: WaybillBatchOutcome[] = [
    { orderNumber: 'FOX-2026-000001', kind: 'issued', waybillNumber: '20451539698513' },
    { orderNumber: 'FOX-2026-000002', kind: 'not-ready', readiness: WaybillReadiness.NoWeight },
    { orderNumber: 'FOX-2026-000003', kind: 'failed', errorCode: 'PICKUP_POINT_NOT_FOUND' },
  ]

  it('tells a waybill from a gap and from a refusal', () => {
    const issued = outcomes.filter((outcome) => outcome.kind === 'issued')
    const notReady = outcomes.filter((outcome) => outcome.kind === 'not-ready')
    const failed = outcomes.filter((outcome) => outcome.kind === 'failed')

    expect(issued.map((outcome) => outcome.waybillNumber)).toEqual(['20451539698513'])
    expect(notReady.map((outcome) => outcome.readiness)).toEqual([WaybillReadiness.NoWeight])
    expect(failed.map((outcome) => outcome.errorCode)).toEqual(['PICKUP_POINT_NOT_FOUND'])
  })
})
