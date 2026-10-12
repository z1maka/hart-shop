import { describe, expect, it } from 'vitest'
import {
  isChosenCabinetUsable,
  buildDoorWaybillRequest,
  buildWaybillRequest,
  canIssueWaybill,
  canRemoveWaybill,
  codCents,
  doorAddressLines,
  isSettledByRecipient,
  parcelWeightGrams,
  pickupPointLabel,
  recipientDraft,
  suggestedCargoDescription,
  waybillBlocker,
  WaybillBlocker,
  readinessWithPoint,
  waybillReadiness,
  WaybillReadiness,
  type ShippableOrder,
} from '@/features/orders/model/shipment'

const branchOrder: ShippableOrder = {
  orderNumber: '000042',
  status: 'pending',
  deliveryKind: 'branch',
  pickupPointRef: '1ae9ab67-f1b3-11ea-b49b-b8830365bd14',
  paymentRoute: 'cod',
  totalCents: 790_000,
  shippingAddress: { fullName: 'Микола Косенко', phone: '+380 63 063 06 77' },
}

const parcel = { weightGrams: 1500, description: 'Пончо' }

describe('waybillBlocker', () => {
  it('lets a branch order with a full name and a Ukrainian phone through', () => {
    expect(waybillBlocker(branchOrder)).toBeNull()
  })

  it('lets a courier order through: its door is picked on the waybill form', () => {
    const courier = { ...branchOrder, deliveryKind: 'courier', pickupPointRef: null }
    expect(waybillBlocker(courier)).toBeNull()
    expect(waybillBlocker({ ...courier, shippingAddress: { fullName: '—' } })).toBeNull()
    expect(waybillBlocker({ ...courier, status: 'shipped' })).toBe(WaybillBlocker.Status)
  })

  it('keeps quick orders in the cabinet: no branch was chosen yet', () => {
    expect(waybillBlocker({ ...branchOrder, pickupPointRef: 'quick-order' })).toBe(
      WaybillBlocker.QuickOrder,
    )
    expect(waybillBlocker({ ...branchOrder, pickupPointRef: null })).toBe(WaybillBlocker.QuickOrder)
  })

  it('keeps a branch typed by hand in the cabinet: it is not a directory id', () => {
    expect(waybillBlocker({ ...branchOrder, pickupPointRef: 'manual' })).toBe(
      WaybillBlocker.ManualPoint,
    )
  })

  it('refuses orders that already left the shop or were cancelled', () => {
    expect(waybillBlocker({ ...branchOrder, status: 'shipped' })).toBe(WaybillBlocker.Status)
    expect(waybillBlocker({ ...branchOrder, status: 'cancelled' })).toBe(WaybillBlocker.Status)
    expect(waybillBlocker({ ...branchOrder, status: 'packed' })).toBeNull()
  })

  it('answers with the status first: a closed order asks for no recipient', () => {
    const cancelledQuickOrder = {
      ...branchOrder,
      status: 'cancelled',
      pickupPointRef: 'quick-order',
      shippingAddress: { fullName: '—', phone: '+380630630677' },
    }
    expect(waybillBlocker(cancelledQuickOrder)).toBe(WaybillBlocker.Status)
    expect(isSettledByRecipient(waybillBlocker(cancelledQuickOrder))).toBe(false)
    expect(waybillBlocker({ ...branchOrder, status: 'delivered', pickupPointRef: 'manual' })).toBe(
      WaybillBlocker.Status,
    )
  })

  it('needs a last name and a dialable phone for the recipient', () => {
    expect(
      waybillBlocker({
        ...branchOrder,
        shippingAddress: { fullName: '—', phone: '+380630630677' },
      }),
    ).toBe(WaybillBlocker.Recipient)
    expect(
      waybillBlocker({
        ...branchOrder,
        shippingAddress: { fullName: 'Микола Косенко', phone: '+49 30 1234567' },
      }),
    ).toBe(WaybillBlocker.Recipient)
  })

  it('takes a dash for no last name, the way the recipient editor reads it', () => {
    for (const fullName of ['Микола -', 'Микола —', '— Микола']) {
      const order = { ...branchOrder, shippingAddress: { fullName, phone: '+380630630677' } }
      expect(waybillBlocker(order)).toBe(WaybillBlocker.Recipient)
      expect(buildWaybillRequest(order, parcel)).toBeNull()
    }
  })
})

describe('buildWaybillRequest', () => {
  it('splits the name, normalises the phone and collects the total on delivery', () => {
    expect(buildWaybillRequest(branchOrder, parcel)).toEqual({
      orderNumber: '000042',
      recipient: { firstName: 'Микола', lastName: 'Косенко', phone: '380630630677' },
      destination: { kind: 'point', pointRef: branchOrder.pickupPointRef },
      weightGrams: 1500,
      declaredValueCents: 790_000,
      codCents: 790_000,
      description: 'Пончо',
    })
  })

  it('keeps a compound last name together', () => {
    const request = buildWaybillRequest(
      {
        ...branchOrder,
        shippingAddress: { fullName: 'Анна Петренко Іванова', phone: '0630630677' },
      },
      parcel,
    )
    expect(request?.recipient).toEqual({
      firstName: 'Анна',
      lastName: 'Петренко Іванова',
      phone: '380630630677',
    })
  })

  it('carries no cash-on-delivery amount for a prepaid order', () => {
    expect(buildWaybillRequest({ ...branchOrder, paymentRoute: 'card' }, parcel)?.codCents).toBe(0)
    expect(codCents({ ...branchOrder, paymentRoute: 'bank_transfer' })).toBe(0)
  })

  it('answers null for anything the blocker refuses, and for a courier order', () => {
    expect(buildWaybillRequest({ ...branchOrder, deliveryKind: 'courier' }, parcel)).toBeNull()
    expect(buildWaybillRequest({ ...branchOrder, status: 'delivered' }, parcel)).toBeNull()
  })
})

describe('buildDoorWaybillRequest', () => {
  const courierOrder = { ...branchOrder, deliveryKind: 'courier', pickupPointRef: null }
  const door = {
    firstName: 'Марія',
    lastName: 'Петренко',
    phone: '+380 67 123 45 67',
    cityRef: 'city',
    streetRef: 'street',
    house: '22',
    flat: '5',
  }

  it('sends a courier order to the door picked on the form, with the form recipient', () => {
    expect(buildDoorWaybillRequest(courierOrder, parcel, door)).toEqual({
      orderNumber: '000042',
      recipient: { firstName: 'Марія', lastName: 'Петренко', phone: '380671234567' },
      destination: { kind: 'door', cityRef: 'city', streetRef: 'street', house: '22', flat: '5' },
      weightGrams: 1500,
      declaredValueCents: 790_000,
      codCents: 790_000,
      description: 'Пончо',
    })
  })

  it('refuses a branch order and a phone the carrier cannot dial', () => {
    expect(buildDoorWaybillRequest(branchOrder, parcel, door)).toBeNull()
    expect(buildDoorWaybillRequest(courierOrder, parcel, { ...door, phone: '123' })).toBeNull()
  })

  it('writes the door the way the order page shows it', () => {
    expect(doorAddressLines({ ...door, cityName: 'м. Київ', streetName: 'вул. Хрещатик' })).toEqual(
      {
        fullName: 'Марія Петренко',
        phone: '+380 67 123 45 67',
        line1: 'вул. Хрещатик, 22, кв. 5',
        line2: '',
        city: 'м. Київ',
      },
    )
  })
})

describe('waybill status rules', () => {
  it('issues only while the parcel is still in the shop', () => {
    expect(['pending', 'paid', 'packed'].every(canIssueWaybill)).toBe(true)
    expect(['shipped', 'delivered', 'cancelled', 'refunded'].some(canIssueWaybill)).toBe(false)
  })

  it('cancels until the handover, and for a cancelled order', () => {
    expect(['pending', 'paid', 'packed', 'cancelled'].every(canRemoveWaybill)).toBe(true)
    expect(['shipped', 'delivered', 'refunded'].some(canRemoveWaybill)).toBe(false)
  })
})

describe('parcel defaults', () => {
  const items = [
    { productTitle: 'Антидрон пончо PREDATOR', quantity: 2, weightGrams: 1500 },
    { productTitle: 'Чохол для Starlink', quantity: 1, weightGrams: 0 },
  ]

  it('adds the lines up by quantity', () => {
    expect(parcelWeightGrams(items)).toBe(3000)
    expect(parcelWeightGrams([])).toBe(0)
  })

  it('suggests the first product as the cargo description', () => {
    expect(suggestedCargoDescription(items)).toBe('Антидрон пончо PREDATOR')
    expect(suggestedCargoDescription([])).toBe('')
  })

  it('strips what the carrier refuses to print', () => {
    // «Description is not valid» — the answer to a title carrying the
    // typographic quotes and dashes the WordPress import left behind.
    const fancy = [
      { productTitle: 'Антидрон пончо Zero – CLASS “А” (UV+EM захист)', quantity: 1, weightGrams: 1 },
    ]
    expect(suggestedCargoDescription(fancy)).toBe('Антидрон пончо Zero - CLASS А (UV+EM захист)')
  })
})

describe('settling the recipient after the call', () => {
  it('is offered for quick orders, hand-typed branches and unusable names only', () => {
    expect(isSettledByRecipient(WaybillBlocker.QuickOrder)).toBe(true)
    expect(isSettledByRecipient(WaybillBlocker.ManualPoint)).toBe(true)
    expect(isSettledByRecipient(WaybillBlocker.UnknownPoint)).toBe(true)
    expect(isSettledByRecipient(WaybillBlocker.Recipient)).toBe(true)
    expect(isSettledByRecipient(WaybillBlocker.Status)).toBe(false)
    expect(isSettledByRecipient(null)).toBe(false)
  })

  it("drafts nothing from the quick order's placeholder name", () => {
    const quick = { ...branchOrder, shippingAddress: { fullName: '—', phone: '+380 63 063 06 77' } }
    expect(recipientDraft(quick)).toEqual({
      firstName: '',
      lastName: '',
      phone: '+380 63 063 06 77',
    })
  })

  it('offers the typed name back split in two', () => {
    expect(recipientDraft(branchOrder)).toEqual({
      firstName: 'Микола',
      lastName: 'Косенко',
      phone: '+380 63 063 06 77',
    })
  })

  it('labels the point the way the checkout does', () => {
    expect(pickupPointLabel('Відділення №30: вул. Будівельників, 18/6', 'м. Миколаїв')).toBe(
      'Відділення №30: вул. Будівельників, 18/6 · м. Миколаїв',
    )
  })
})

describe('waybillReadiness', () => {
  const readyOrder = { ...branchOrder, carrierDocumentRef: null }

  it('takes a branch order with a weighed parcel into the daily round', () => {
    expect(waybillReadiness(readyOrder, 1500)).toBe(WaybillReadiness.Ready)
  })

  it('leaves out what the round cannot do on its own', () => {
    expect(waybillReadiness({ ...readyOrder, carrierDocumentRef: 'ref' }, 1500)).toBe(
      WaybillReadiness.Issued,
    )
    expect(waybillReadiness(readyOrder, 0)).toBe(WaybillReadiness.NoWeight)
    expect(waybillReadiness({ ...readyOrder, pickupPointRef: 'quick-order' }, 1500)).toBe(
      WaybillReadiness.Blocked,
    )
    expect(waybillReadiness({ ...readyOrder, status: 'cancelled' }, 1500)).toBe(
      WaybillReadiness.Blocked,
    )
  })

  it('leaves a courier order to its own form, where the door is picked', () => {
    const courier = { ...readyOrder, deliveryKind: 'courier', pickupPointRef: null }
    expect(waybillReadiness(courier, 1500)).toBe(WaybillReadiness.Blocked)
  })
})

describe('readinessWithPoint', () => {
  it('holds back an order whose branch the directory does not know', () => {
    expect(readinessWithPoint(WaybillReadiness.Ready, false)).toBe(WaybillReadiness.UnknownPoint)
    expect(readinessWithPoint(WaybillReadiness.Ready, true)).toBe(WaybillReadiness.Ready)
  })

  it('leaves a gap the directory cannot explain as it was', () => {
    expect(readinessWithPoint(WaybillReadiness.NoWeight, false)).toBe(WaybillReadiness.NoWeight)
    expect(readinessWithPoint(WaybillReadiness.Issued, false)).toBe(WaybillReadiness.Issued)
    expect(readinessWithPoint(WaybillReadiness.Blocked, false)).toBe(WaybillReadiness.Blocked)
  })
})

describe('isChosenCabinetUsable', () => {
  const cabinet = { id: 'cabinet-2', isActive: true }

  it('lets the default cabinet write the waybill when none was picked', () => {
    expect(isChosenCabinetUsable(null, null)).toBe(true)
  })

  it('accepts the picked cabinet only when it is the one that resolved', () => {
    expect(isChosenCabinetUsable('cabinet-2', cabinet)).toBe(true)
    // Another cabinet answering for it would print the wrong sender.
    expect(isChosenCabinetUsable('cabinet-3', cabinet)).toBe(false)
    expect(isChosenCabinetUsable('cabinet-2', null)).toBe(false)
  })

  it('refuses a cabinet switched off since the page loaded', () => {
    expect(isChosenCabinetUsable('cabinet-2', { ...cabinet, isActive: false })).toBe(false)
  })
})
