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
import { daysAgo, formatDateIsoKyiv } from '@/lib/datetime'
import { env } from '@/lib/env'
import {
  CarrierAnswerMalformedError,
  CarrierUnavailableError,
  PickupPointNotFoundError,
  WaybillEditedInCabinetError,
  WaybillNotAtCarrierError,
  WaybillNotEditableError,
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
// The days searched for a waybill to update: one still not handed over a
// month after the order is not worth listing the whole cabinet for, and a
// sending date can be moved forward in the cabinet.
const UPDATE_SEARCH_DAYS_BACK = 30
const UPDATE_SEARCH_DAYS_AHEAD = 14
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

// A field the update sends back as it was: a string or a number in their
// list, never a missing or null one turned into the word «null».
const cabinetText = z.union([z.string(), z.number()]).transform(String)

// The seat as the cabinet keeps it. Packaging and special cargo are set
// only in the cabinet, and a save from here would drop them.
const SeatSchema = z.object({
  volumetricVolume: cabinetText,
  volumetricWidth: cabinetText,
  volumetricLength: cabinetText,
  volumetricHeight: cabinetText,
  weight: cabinetText,
  packRef: z.string().nullish(),
  specialCargo: z.union([z.boolean(), z.string(), z.number()]).nullish(),
})

type Seat = z.infer<typeof SeatSchema>

// A waybill as the cabinet lists it, with what an update must send back:
// they take the whole document again, not just the field that changes.
export const ListedDocumentSchema = z.object({
  Ref: z.string().min(1),
  IntDocNumber: z.string().min(1),
  Edit: z.boolean(),
  // «2026-10-26 11:26:14», kept as the day «2026-10-26».
  DateTime: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}[ T]/)
    .transform((listed) => listed.replace(/[ T].*$/, '')),
  PayerType: cabinetText,
  PaymentMethod: cabinetText,
  CargoType: cabinetText,
  Weight: cabinetText,
  ServiceType: cabinetText,
  SeatsAmount: cabinetText,
  Description: cabinetText,
  Cost: cabinetText,
  CitySender: cabinetText,
  Sender: cabinetText,
  SenderAddress: cabinetText,
  ContactSender: cabinetText,
  SendersPhone: cabinetText,
  CityRecipient: cabinetText,
  Recipient: cabinetText,
  RecipientAddress: cabinetText,
  ContactRecipient: cabinetText,
  RecipientsPhone: cabinetText,
  InfoRegClientBarcodes: cabinetText,
  OptionsSeat: z
    .array(SeatSchema)
    .nullish()
    .transform((seats) => seats ?? []),
})

export type ListedDocument = z.infer<typeof ListedDocumentSchema>

const UpdatedDocumentSchema = z.array(
  z.object({ Ref: z.string().min(1), IntDocNumber: z.string().min(1) }),
)

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

  async updateCod(ref: string, codCents: number, issuedSince: Date): Promise<void> {
    const document = await findDocument(ref, issuedSince, apiKey)
    if (!document.Edit) throw new WaybillNotEditableError(ref)
    if (document.OptionsSeat.some(hasCabinetOnlyOptions)) {
      throw new WaybillEditedInCabinetError(ref)
    }

    const data = await novaPoshtaCall(
      'InternetDocument',
      'update',
      codUpdateProperties(document, codCents, formatDateIsoKyiv(new Date())),
      apiKey,
    )
    const [updated] = parseAnswer(UpdatedDocumentSchema, data, 'InternetDocument.update')
    if (updated.Ref !== ref) {
      logger.error('Nova Poshta updated another document', { ref, updated: updated.Ref })
      throw new CarrierAnswerMalformedError(Carrier.NovaPost, 'InternetDocument.update')
    }
    if (updated.IntDocNumber !== document.IntDocNumber) {
      logger.error('Nova Poshta renumbered the waybill on update', {
        ref,
        was: document.IntDocNumber,
        now: updated.IntDocNumber,
      })
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

// Their API finds a waybill by listing the cabinet's documents for dates;
// the order's own date bounds the list from below.
async function findDocument(
  ref: string,
  issuedSince: Date,
  apiKey: string | undefined,
): Promise<ListedDocument> {
  const now = new Date()
  const oldest = daysAgo(now, UPDATE_SEARCH_DAYS_BACK)
  const data = await novaPoshtaCall(
    'InternetDocument',
    'getDocumentList',
    {
      DateTimeFrom: kyivDate(issuedSince > oldest ? issuedSince : oldest),
      DateTimeTo: kyivDate(daysAgo(now, -UPDATE_SEARCH_DAYS_AHEAD)),
      GetFullList: '1',
    },
    apiKey,
  )
  const listed = data.find(
    (entry): entry is { Ref: string } =>
      typeof entry === 'object' && entry !== null && 'Ref' in entry && entry.Ref === ref,
  )
  if (listed === undefined) throw new WaybillNotAtCarrierError(ref)

  const parsed = ListedDocumentSchema.safeParse(listed)
  if (!parsed.success) {
    logger.error('Nova Poshta listed the waybill in an unexpected shape', {
      ref,
      issues: parsed.error.issues,
    })
    throw new CarrierAnswerMalformedError(Carrier.NovaPost, 'InternetDocument.getDocumentList')
  }
  return parsed.data
}

// How their list marks a seat as special cargo; false, '0' and null do not.
const SPECIAL_CARGO_MARKS: readonly unknown[] = [true, '1', 1]

function hasCabinetOnlyOptions(seat: Seat): boolean {
  return Boolean(seat.packRef) || SPECIAL_CARGO_MARKS.includes(seat.specialCargo)
}

// The document as it stands, with only the payment-control amount new. A
// waybill written on an earlier day moves to today: they refuse a sending
// date in the past. Days are Kyiv ISO keys, which compare as strings.
export function codUpdateProperties(
  document: ListedDocument,
  codCents: number,
  todayIso: string,
): NovaPoshtaProperties {
  const sendingDay = document.DateTime < todayIso ? todayIso : document.DateTime
  return {
    Ref: document.Ref,
    PayerType: document.PayerType,
    PaymentMethod: document.PaymentMethod,
    DateTime: cabinetDate(sendingDay),
    CargoType: document.CargoType,
    Weight: document.Weight,
    ServiceType: document.ServiceType,
    SeatsAmount: document.SeatsAmount,
    Description: document.Description,
    Cost: document.Cost,
    CitySender: document.CitySender,
    Sender: document.Sender,
    SenderAddress: document.SenderAddress,
    ContactSender: document.ContactSender,
    SendersPhone: document.SendersPhone,
    CityRecipient: document.CityRecipient,
    Recipient: document.Recipient,
    RecipientAddress: document.RecipientAddress,
    ContactRecipient: document.ContactRecipient,
    RecipientsPhone: document.RecipientsPhone,
    InfoRegClientBarcodes: document.InfoRegClientBarcodes,
    ...(document.OptionsSeat.length > 0
      ? { OptionsSeat: document.OptionsSeat.map(savedSeat) }
      : {}),
    AfterpaymentOnGoodsCost: hryvnias(codCents),
  }
}

function savedSeat(seat: Seat): Record<string, string> {
  return {
    volumetricVolume: seat.volumetricVolume,
    volumetricWidth: seat.volumetricWidth,
    volumetricLength: seat.volumetricLength,
    volumetricHeight: seat.volumetricHeight,
    weight: seat.weight,
  }
}

// «2026-10-26» → «26.10.2026», the date as save takes it.
function cabinetDate(isoDay: string): string {
  return isoDay.split('-').reverse().join('.')
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
  return kyivDate(new Date())
}

function kyivDate(moment: Date): string {
  return new Intl.DateTimeFormat('uk-UA', {
    timeZone: KYIV_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(moment)
}
