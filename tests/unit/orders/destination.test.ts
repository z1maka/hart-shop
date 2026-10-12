import { describe, expect, it } from 'vitest'
import { MANUAL_PICKUP_POINT_REF } from '@/config/delivery'
import { DeliveryKind } from '@/db/enums'
import {
  DestinationKind,
  destinationWithPoint,
  orderDestination,
  shortenPointLabel,
  type AddressedOrder,
} from '@/features/orders/model/destination'
import { QUICK_ORDER_POINT_REF } from '@/features/orders/model/quick-order'

function order(overrides: Partial<AddressedOrder> = {}): AddressedOrder {
  return {
    deliveryKind: DeliveryKind.Branch,
    pickupPointRef: 'ref-1',
    pickupPointLabel: 'Відділення №12 · Київ',
    shippingAddress: { city: 'Київ', line1: 'вул. Хрещатик, 1' },
    ...overrides,
  }
}

describe('orderDestination', () => {
  it('prints the branch the buyer picked', () => {
    expect(orderDestination(order())).toEqual({
      kind: DestinationKind.Branch,
      label: 'Відділення №12 · Київ',
    })
  })

  it('reads a quick order from its marker and from a missing reference alike', () => {
    const marked = orderDestination(order({ pickupPointRef: QUICK_ORDER_POINT_REF }))
    const missing = orderDestination(order({ pickupPointRef: null }))

    expect(marked.kind).toBe(DestinationKind.Quick)
    expect(missing.kind).toBe(DestinationKind.Quick)
    expect(marked.label).toBeNull()
  })

  it('keeps a branch typed by hand apart from one the directory named', () => {
    const typed = orderDestination(
      order({ pickupPointRef: MANUAL_PICKUP_POINT_REF, pickupPointLabel: 'Відділення №3' }),
    )

    expect(typed).toEqual({ kind: DestinationKind.Manual, label: 'Відділення №3' })
  })

  it('gives a courier order its street, not the branch label', () => {
    const courier = orderDestination(
      order({ deliveryKind: DeliveryKind.Courier, pickupPointRef: null }),
    )

    expect(courier).toEqual({
      kind: DestinationKind.Courier,
      label: 'вул. Хрещатик, 1, Київ',
    })
  })

  it('leaves the label empty when a courier order carries no address', () => {
    const blank = orderDestination(
      order({
        deliveryKind: DeliveryKind.Courier,
        shippingAddress: { city: '  ', line1: '' },
      }),
    )

    expect(blank.label).toBeNull()
  })
})

describe('destinationWithPoint', () => {
  it('marks a branch the carrier no longer knows', () => {
    const unknown = destinationWithPoint(orderDestination(order()), false)

    expect(unknown.kind).toBe(DestinationKind.UnknownBranch)
    expect(unknown.label).toBe('Відділення №12 · Київ')
  })

  it('leaves everything else as it found it', () => {
    const quick = orderDestination(order({ pickupPointRef: QUICK_ORDER_POINT_REF }))
    const courier = orderDestination(order({ deliveryKind: DeliveryKind.Courier }))

    expect(destinationWithPoint(quick, false)).toBe(quick)
    expect(destinationWithPoint(courier, false)).toBe(courier)
    expect(destinationWithPoint(orderDestination(order()), true).kind).toBe(DestinationKind.Branch)
  })
})

describe('shortenPointLabel', () => {
  it('drops the weight note the carrier writes into every branch name', () => {
    expect(
      shortenPointLabel('Відділення №30 (до 30 кг на одне місце): вул. Будівельників, 18/6'),
    ).toBe('Відділення №30: вул. Будівельників, 18/6')
  })

  it('keeps a parenthesis that says something else', () => {
    expect(shortenPointLabel('Поштомат №1234 (біля входу)')).toBe('Поштомат №1234 (біля входу)')
  })

  it('answers nothing for a label that had nothing but the note', () => {
    expect(shortenPointLabel('(до 30 кг)')).toBeNull()
    expect(shortenPointLabel(null)).toBeNull()
  })
})
