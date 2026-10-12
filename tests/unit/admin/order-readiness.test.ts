import { describe, expect, it } from 'vitest'
import { readinessHint, readinessNote } from '@/features/admin/ui/order-readiness'
import { WaybillReadiness } from '@/features/orders/model/shipment'

describe('order readiness copy', () => {
  it('explains every state the list can show', () => {
    for (const readiness of Object.values(WaybillReadiness)) {
      const hint = readinessHint(readiness)
      expect(typeof hint).toBe('string')
      if (readiness !== WaybillReadiness.Ready) expect(hint.length).toBeGreaterThan(0)
    }
  })

  it('puts a line beside the status only for a gap the column does not show', () => {
    expect(readinessNote(WaybillReadiness.NoWeight)).toBe('Нет веса для ТТН')
    expect(readinessNote(WaybillReadiness.Ready)).toBeNull()
    expect(readinessNote(WaybillReadiness.Blocked)).toBeNull()
    // The «Отделение» column carries this one, in red, where it belongs.
    expect(readinessNote(WaybillReadiness.UnknownPoint)).toBeNull()
  })
})
