import { z } from 'zod'
import { Carrier } from '@/db/enums'
import { COMPANY } from '@/config/company'
import type {
  Waybill,
  WaybillDestination,
  WaybillRecipient,
  WaybillRequest,
  WaybillService,
} from '@/features/shipping/model/waybill'
import type { ParcelStatus } from '@/features/shipping/model/parcel-tracking'
import { pickupPointRepository } from '@/features/shipping/repository/pickup-point-repository'
import { trackNovaPostParcels } from '@/features/shipping/services/nova-post-tracking'
import { env } from '@/lib/env'
import {
  CarrierAnswerMalformedError,
  CarrierUnavailableError,
  PickupPointNotFoundError,
} from '@/lib/errors'
import { logger } from '@/lib/logger'
import {
  isNovaPoshtaErrorCode,
  novaPoshtaCall,
  novaPoshtaLabelPdf,
  type NovaPoshtaProperties,
} from '@/lib/nova-post'

const TRACKING_URL = 'https://novaposhta.ua/tracking/?cargo_number='
const GRAMS_PER_KILO = 1000
const KOPIYKAS_PER_HRYVNIA = 100
const CUBIC_CM_PER_CUBIC_M = 1_000_000
const KYIV_TIME_ZONE = 'Europe/Kyiv'
// "No document changed DeletionMark": the waybill is no longer in the
// cabinet — deleted there by hand, or by an earlier attempt of ours.
const ALREADY_DELETED_CODE = '20000201173'

// The shop's standard box in centimetres, the one every waybill of the
// owner's history states. A locker cell is 60×40×30.
const BOX_CM = { width: 30, length: 30, height: 20 } as const

const SavedRecipientSchema = z.array(
  z.object({
    Ref: z.string().min(1),
    ContactPerson: z.object({
      data: z.tuple([z.object({ Ref: z.string().min(1) })], z.unknown()),
    }),
  }),
)

const SavedDocumentSchema = z.array(
  z.object({
    Ref: z.string().min(1),
    IntDocNumber: z.string().min(1),
    EstimatedDeliveryDate: z.string().default(''),
  }),
)

const DeletedDocumentSchema = z.array(z.object({ Ref: z.string() }))

const SavedAddressSchema = z.array(z.object({ Ref: z.string().min(1) }))

export type Sender = {
  readonly ref: string
  readonly contactRef: string
  readonly cityRef: string
  readonly warehouseRef: string
  readonly phone: string
}

type Recipient = {
  readonly ref: string
  readonly contactRef: string
}

// A cabinet to work through: its key and the counterparty a waybill leaves
// from. Null means the single cabinet configured in the environment, which
// is what the shop ran on before it had several.
export type NovaPostCabinet = {
  readonly apiKey: string
  readonly sender: Sender
}

export function novaPostWaybillsFor(cabinet: NovaPostCabinet | null): WaybillService {
  const apiKey = cabinet?.apiKey
  const sender = cabinet?.sender ?? readSender()

  return {
  carrier: Carrier.NovaPost,

  isConfigured(): boolean {
    return Boolean(apiKey ?? env.NOVA_POST_API_KEY) && sender !== null
  },

  async create(request: WaybillRequest): Promise<Waybill> {
    if (!sender) throw new CarrierUnavailableError(Carrier.NovaPost, 0)

    const recipient = await saveRecipient(request.recipient, apiKey)
    const data = await novaPoshtaCall('InternetDocument', 'save', {
      ...parcelProperties(request),
      ...senderProperties(sender),
      ...(await destinationProperties(request.destination, recipient)),
      Recipient: recipient.ref,
      ContactRecipient: recipient.contactRef,
      RecipientsPhone: request.recipient.phone,
    }, apiKey)
    const [saved] = parseAnswer(SavedDocumentSchema, data, 'InternetDocument.save')

    return {
      ref: saved.Ref,
      number: saved.IntDocNumber,
      trackingUrl: trackingUrlFor(saved.IntDocNumber),
      estimatedDelivery: saved.EstimatedDeliveryDate || null,
    }
  },

  async remove(ref: string): Promise<void> {
    try {
      const data = await novaPoshtaCall(
        'InternetDocument',
        'delete',
        { DocumentRefs: [ref] },
        apiKey,
      )
      const deleted = parseAnswer(DeletedDocumentSchema, data, 'InternetDocument.delete')
      if (!deleted.some((entry) => entry.Ref === ref)) {
        logger.error('Nova Poshta deleted something else', { ref, deleted })
        throw new CarrierAnswerMalformedError(Carrier.NovaPost, 'InternetDocument.delete')
      }
    } catch (error) {
      if (!isNovaPoshtaErrorCode(error, ALREADY_DELETED_CODE)) throw error
      logger.info('Waybill was already gone from the cabinet', { ref })
    }
  },

  labelPdf(number: string): Promise<ArrayBuffer> {
    return novaPoshtaLabelPdf(number, apiKey)
  },

  trackingUrl(number: string): string {
    return trackingUrlFor(number)
  },

  track(numbers: readonly string[]): Promise<ParcelStatus[]> {
    return trackNovaPostParcels(numbers, apiKey)
  },
  }
}

// The cabinet from the environment: one key, one sender, the shape the shop
// ran on before cabinets were a thing.
export const novaPostWaybills: WaybillService = novaPostWaybillsFor(null)

function trackingUrlFor(number: string): string {
  return `${TRACKING_URL}${encodeURIComponent(number)}`
}

// The branch parcels are handed over at, as the environment names it. The
// workshop sends from one branch whichever cabinet writes the waybill, so a
// cabinet falls back to this one until the admin picks it in settings.
export function envSendingBranch(): {
  readonly cityRef: string
  readonly warehouseRef: string
} | null {
  const cityRef = env.NOVA_POST_SENDER_CITY_REF
  const warehouseRef = env.NOVA_POST_SENDER_WAREHOUSE_REF
  return cityRef && warehouseRef ? { cityRef, warehouseRef } : null
}

function readSender(): Sender | null {
  const ref = env.NOVA_POST_SENDER_REF
  const contactRef = env.NOVA_POST_SENDER_CONTACT_REF
  const branch = envSendingBranch()
  if (!ref || !contactRef || !branch) return null

  return { ref, contactRef, ...branch, phone: COMPANY.phone.replace(/\D/g, '') }
}

// Every buyer becomes a fresh private-person counterparty in the cabinet:
// their API has no lookup by phone, and a duplicate costs nothing.
async function saveRecipient(
  recipient: WaybillRecipient,
  apiKey: string | undefined,
): Promise<Recipient> {
  const data = await novaPoshtaCall('Counterparty', 'save', {
    CounterpartyType: 'PrivatePerson',
    CounterpartyProperty: 'Recipient',
    FirstName: recipient.firstName,
    LastName: recipient.lastName,
    Phone: recipient.phone,
  }, apiKey)
  const [saved] = parseAnswer(SavedRecipientSchema, data, 'Counterparty.save')
  const [contact] = saved.ContactPerson.data

  return { ref: saved.Ref, contactRef: contact.Ref }
}

// Branch to branch for a point; branch to door for a street, where the
// door is saved as an address of this recipient first — their waybill
// takes an address ref, not a street and a number.
async function destinationProperties(
  destination: WaybillDestination,
  recipient: Recipient,
): Promise<NovaPoshtaProperties> {
  if (destination.kind === 'point') {
    const point = await pickupPointRepository.findByRef(Carrier.NovaPost, destination.pointRef)
    if (!point) throw new PickupPointNotFoundError(destination.pointRef)
    return {
      ServiceType: 'WarehouseWarehouse',
      CityRecipient: point.settlementRef,
      RecipientAddress: point.ref,
    }
  }

  const data = await novaPoshtaCall('Address', 'save', {
    CounterpartyRef: recipient.ref,
    StreetRef: destination.streetRef,
    BuildingNumber: destination.house,
    Flat: destination.flat ?? '',
  })
  const [address] = parseAnswer(SavedAddressSchema, data, 'Address.save')
  return {
    ServiceType: 'WarehouseDoors',
    CityRecipient: destination.cityRef,
    RecipientAddress: address.Ref,
  }
}

// One box, paid for by the recipient on delivery, with the order number in
// the field the cabinet prints on the label.
function parcelProperties(request: WaybillRequest): NovaPoshtaProperties {
  const weightKg = kilos(request.weightGrams)
  const cod: NovaPoshtaProperties =
    request.codCents > 0 ? { AfterpaymentOnGoodsCost: hryvnias(request.codCents) } : {}

  return {
    PayerType: 'Recipient',
    PaymentMethod: 'Cash',
    DateTime: todayInKyiv(),
    CargoType: 'Parcel',
    SeatsAmount: '1',
    Weight: weightKg,
    Description: request.description,
    Cost: hryvnias(request.declaredValueCents),
    InfoRegClientBarcodes: request.orderNumber,
    OptionsSeat: [seatOptions(weightKg)],
    ...cod,
  }
}

function seatOptions(weightKg: string): Record<string, string> {
  const volumeM3 = (BOX_CM.width * BOX_CM.length * BOX_CM.height) / CUBIC_CM_PER_CUBIC_M
  return {
    volumetricVolume: String(volumeM3),
    volumetricWidth: String(BOX_CM.width),
    volumetricLength: String(BOX_CM.length),
    volumetricHeight: String(BOX_CM.height),
    weight: weightKg,
  }
}

function senderProperties(sender: Sender): NovaPoshtaProperties {
  return {
    CitySender: sender.cityRef,
    Sender: sender.ref,
    SenderAddress: sender.warehouseRef,
    ContactSender: sender.contactRef,
    SendersPhone: sender.phone,
  }
}

// Success with an answer we cannot read is logged with the raw data: for a
// saved waybill it holds the ref of a document that may now exist.
function parseAnswer<T extends readonly unknown[]>(
  schema: z.ZodType<T>,
  data: unknown[],
  method: string,
): [T[number], ...T[number][]] {
  const parsed = schema.safeParse(data)
  const [first, ...rest] = parsed.success ? parsed.data : []
  if (first === undefined) {
    logger.error('Nova Poshta answered in an unexpected shape', {
      method,
      data,
      issues: parsed.error?.issues,
    })
    throw new CarrierAnswerMalformedError(Carrier.NovaPost, method)
  }
  return [first, ...rest]
}

function kilos(grams: number): string {
  return (grams / GRAMS_PER_KILO).toFixed(2)
}

function hryvnias(cents: number): string {
  return (cents / KOPIYKAS_PER_HRYVNIA).toFixed(2)
}

// The shipping date they expect as dd.mm.yyyy, on the sender's calendar.
function todayInKyiv(): string {
  return new Intl.DateTimeFormat('uk-UA', {
    timeZone: KYIV_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date())
}
