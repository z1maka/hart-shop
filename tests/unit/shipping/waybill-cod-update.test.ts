import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ call: vi.fn() }))

vi.mock('@/lib/env', () => ({ env: {} }))
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() } }))
vi.mock('@/lib/nova-post', () => ({
  novaPoshtaCall: mocks.call,
  novaPoshtaLabelPdf: vi.fn(),
  isNovaPoshtaErrorCode: vi.fn(),
}))
vi.mock('@/features/shipping/repository/pickup-point-repository', () => ({
  pickupPointRepository: {},
}))

import {
  codUpdateProperties,
  ListedDocumentSchema,
  novaPostWaybillsFor,
} from '@/features/shipping/services/nova-post-waybills'

// A waybill as getDocumentList gives it, cut to the fields that matter here.
const RAW_LISTED = {
  Ref: 'doc-1',
  IntDocNumber: '20451570452417',
  Edit: true,
  StateId: 1,
  DateTime: '2026-10-26 11:26:14',
  PayerType: 'Recipient',
  PaymentMethod: 'Cash',
  CargoType: 'Parcel',
  Weight: '21.00',
  ServiceType: 'WarehouseWarehouse',
  SeatsAmount: '1',
  Description: 'Посилене пончо з кишенею, мультикам',
  Cost: '42000.00',
  AfterpaymentOnGoodsCost: '42000.00',
  CitySender: 'city-sender',
  Sender: 'sender',
  SenderAddress: 'sender-branch',
  ContactSender: 'contact-sender',
  SendersPhone: '380630630677',
  CityRecipient: 'city-recipient',
  Recipient: 'recipient',
  RecipientAddress: 'recipient-branch',
  ContactRecipient: 'contact-recipient',
  RecipientsPhone: '380501112233',
  InfoRegClientBarcodes: 'HART-2026-000019',
  OptionsSeat: [
    {
      volumetricVolume: '0.0180',
      volumetricWidth: '30',
      volumetricLength: '30',
      volumetricHeight: '20',
      weight: '21',
      volumetricWeight: '4.5',
      cost: '0',
      specialCargo: false,
      description: null,
      packRef: null,
      packRef1: null,
    },
  ],
}

const LISTED = ListedDocumentSchema.parse(RAW_LISTED)

describe('ListedDocumentSchema', () => {
  it('keeps the sending day of the listed date', () => {
    expect(LISTED.DateTime).toBe('2026-10-26')
  })

  it('refuses a null field instead of sending the word back', () => {
    const parsed = ListedDocumentSchema.safeParse({ ...RAW_LISTED, InfoRegClientBarcodes: null })

    expect(parsed.success).toBe(false)
  })

  it('refuses a document missing a field the update sends back', () => {
    const { ContactRecipient: _dropped, ...withoutContact } = RAW_LISTED

    expect(ListedDocumentSchema.safeParse(withoutContact).success).toBe(false)
  })

  it('reads a document listed without seats as having none', () => {
    expect(ListedDocumentSchema.parse({ ...RAW_LISTED, OptionsSeat: null }).OptionsSeat).toEqual([])
  })
})

describe('codUpdateProperties', () => {
  it('sends the whole document back with only the cash-on-delivery amount new', () => {
    const properties = codUpdateProperties(LISTED, 4_100_000, '2026-10-26')

    expect(properties).toMatchObject({
      Ref: 'doc-1',
      Cost: '42000.00',
      Recipient: 'recipient',
      RecipientAddress: 'recipient-branch',
      InfoRegClientBarcodes: 'HART-2026-000019',
      AfterpaymentOnGoodsCost: '41000.00',
    })
    expect(properties).not.toHaveProperty('Edit')
    expect(properties).not.toHaveProperty('IntDocNumber')
  })

  it('sends the seats back with only the fields a save takes', () => {
    expect(codUpdateProperties(LISTED, 4_100_000, '2026-10-26').OptionsSeat).toEqual([
      {
        volumetricVolume: '0.0180',
        volumetricWidth: '30',
        volumetricLength: '30',
        volumetricHeight: '20',
        weight: '21',
      },
    ])
  })

  it('keeps the date of a waybill written today', () => {
    expect(codUpdateProperties(LISTED, 4_100_000, '2026-10-26').DateTime).toBe('26.10.2026')
  })

  it('moves a waybill written on an earlier day to today', () => {
    expect(codUpdateProperties(LISTED, 4_100_000, '2026-11-03').DateTime).toBe('03.11.2026')
  })

  it('keeps a sending date moved forward in the cabinet', () => {
    const later = { ...LISTED, DateTime: '2026-10-28' }

    expect(codUpdateProperties(later, 4_100_000, '2026-10-26').DateTime).toBe('28.10.2026')
  })

  it('leaves out the seats when the cabinet listed none', () => {
    const properties = codUpdateProperties({ ...LISTED, OptionsSeat: [] }, 4_100_000, '2026-10-26')

    expect(properties).not.toHaveProperty('OptionsSeat')
  })
})

describe('updateCod', () => {
  const ISSUED_SINCE = new Date('2026-10-26T08:20:00Z')
  const service = novaPostWaybillsFor(null)

  function listing(document: object) {
    mocks.call.mockResolvedValueOnce([{ Ref: 'other-doc' }, document])
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates the listed waybill and checks what came back', async () => {
    listing(RAW_LISTED)
    mocks.call.mockResolvedValueOnce([{ Ref: 'doc-1', IntDocNumber: '20451570452417' }])

    await service.updateCod('doc-1', 4_100_000, ISSUED_SINCE)

    const [model, method, properties] = mocks.call.mock.calls[1] ?? []
    expect([model, method]).toEqual(['InternetDocument', 'update'])
    expect(properties).toMatchObject({ Ref: 'doc-1', AfterpaymentOnGoodsCost: '41000.00' })
  })

  it('tells a waybill gone from the cabinet apart from a malformed answer', async () => {
    mocks.call.mockResolvedValueOnce([{ Ref: 'other-doc' }])

    await expect(service.updateCod('doc-1', 4_100_000, ISSUED_SINCE)).rejects.toMatchObject({
      code: 'WAYBILL_NOT_AT_CARRIER',
    })
    expect(mocks.call).toHaveBeenCalledTimes(1)
  })

  it('refuses a waybill the carrier no longer lets edit', async () => {
    listing({ ...RAW_LISTED, Edit: false })

    await expect(service.updateCod('doc-1', 4_100_000, ISSUED_SINCE)).rejects.toMatchObject({
      code: 'WAYBILL_NOT_EDITABLE',
    })
    expect(mocks.call).toHaveBeenCalledTimes(1)
  })

  it('refuses a waybill with packaging added in the cabinet', async () => {
    const [seat] = RAW_LISTED.OptionsSeat
    listing({ ...RAW_LISTED, OptionsSeat: [{ ...seat, packRef: 'pack-1' }] })

    await expect(service.updateCod('doc-1', 4_100_000, ISSUED_SINCE)).rejects.toMatchObject({
      code: 'WAYBILL_EDITED_IN_CABINET',
    })
    expect(mocks.call).toHaveBeenCalledTimes(1)
  })

  it('reports an update that answered for another document', async () => {
    listing(RAW_LISTED)
    mocks.call.mockResolvedValueOnce([{ Ref: 'other-doc', IntDocNumber: '20451570452417' }])

    await expect(service.updateCod('doc-1', 4_100_000, ISSUED_SINCE)).rejects.toMatchObject({
      code: 'CARRIER_ANSWER_MALFORMED',
    })
  })
})
