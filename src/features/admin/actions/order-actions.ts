'use server'

import { z } from 'zod'
import { WAYBILL_DESCRIPTION_MAX_LENGTH, WAYBILL_PARCEL_GRAMS } from '@/config/delivery'
import { Carrier, DeliveryKind, OrderStatus } from '@/db/enums'
import {
  getMonthReturns,
  getWeekTraffic,
  isMonthKey,
  isWeekKey,
  orderAdminService,
  orderShipmentService,
  toUkrainianMsisdn,
  type IssuedWaybill,
  type MonthReturnsView,
  type TrafficWeekView,
  type WaybillBatchOutcome,
} from '@/features/orders'
import type { StatusChangeOutcome } from '@/features/orders/services/order-admin-service'
import {
  pickupDirectoryFor,
  type PickupPointsResult,
  type Settlement,
  type Street,
} from '@/features/shipping'
import { readAdminSession } from '@/features/admin/session-cookie'
import { hryvniasToKopiykas } from '@/features/admin/model/product-form'
import { actionError, actionOk, toActionError, type ActionResult } from '@/lib/action-result'

const OrderStatusSchema = z.object({
  orderId: z.uuid(),
  status: z.enum(Object.values(OrderStatus) as [OrderStatus, ...OrderStatus[]]),
})

const emptyToNull = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value ? value : null))

const TrackingSchema = z.object({
  orderId: z.uuid(),
  carrier: z
    .enum(Object.values(Carrier) as [Carrier, ...Carrier[]])
    .nullable()
    .catch(null),
  trackingNumber: emptyToNull(120),
  trackingUrl: emptyToNull(600).pipe(z.union([z.url(), z.null()])),
})

// Whole hryvnias: a prepayment is agreed over the phone as a round sum. The
// order's total is the real bound, checked against the order itself.
const PREPAYMENT_MAX_HRYVNIAS = 1_000_000

const prepaidHryvnias = z.number().int().min(0).max(PREPAYMENT_MAX_HRYVNIAS)

const WaybillSchema = z.object({
  orderId: z.uuid(),
  // Typed on the form of a cash-on-delivery order; absent keeps the saved one.
  prepaidHryvnias: prepaidHryvnias.optional(),
  weightGrams: z.number().int().min(WAYBILL_PARCEL_GRAMS.min).max(WAYBILL_PARCEL_GRAMS.max),
  cargoDescription: z.string().trim().min(1).max(WAYBILL_DESCRIPTION_MAX_LENGTH),
  // The cabinet picked on the form; absent while the shop runs on the single
  // cabinet from the environment, and then the default one writes it.
  carrierAccountId: z.uuid().nullable().optional(),
})

const OrderIdSchema = z.object({ orderId: z.uuid() })

const NAME_MAX_LENGTH = 60
const DIRECTORY_REF_MAX_LENGTH = 80
const SETTLEMENT_NAME_MAX_LENGTH = 120
const SEARCH_MAX_LENGTH = 80

const RecipientSchema = z.object({
  orderId: z.uuid(),
  firstName: z.string().trim().min(1).max(NAME_MAX_LENGTH),
  lastName: z.string().trim().min(1).max(NAME_MAX_LENGTH),
  // Stored the way the checkout stores it; the carrier gets 380XXXXXXXXX.
  phone: z
    .string()
    .trim()
    .refine((value) => toUkrainianMsisdn(value) !== null),
  kind: z.enum([DeliveryKind.Branch, DeliveryKind.Locker]),
  pointRef: z.string().trim().min(1).max(DIRECTORY_REF_MAX_LENGTH),
  settlementName: z.string().trim().min(1).max(SETTLEMENT_NAME_MAX_LENGTH),
})

const SettlementSearchSchema = z.object({
  search: z.string().trim().max(SEARCH_MAX_LENGTH),
})

const HOUSE_MAX_LENGTH = 20
const FLAT_MAX_LENGTH = 20

const CourierWaybillSchema = WaybillSchema.extend({
  firstName: z.string().trim().min(1).max(NAME_MAX_LENGTH),
  lastName: z.string().trim().min(1).max(NAME_MAX_LENGTH),
  phone: z
    .string()
    .trim()
    .refine((value) => toUkrainianMsisdn(value) !== null),
  cityRef: z.string().trim().min(1).max(DIRECTORY_REF_MAX_LENGTH),
  cityName: z.string().trim().min(1).max(SETTLEMENT_NAME_MAX_LENGTH),
  streetRef: z.string().trim().min(1).max(DIRECTORY_REF_MAX_LENGTH),
  streetName: z.string().trim().min(1).max(SETTLEMENT_NAME_MAX_LENGTH),
  house: z.string().trim().min(1).max(HOUSE_MAX_LENGTH),
  flat: z
    .string()
    .trim()
    .max(FLAT_MAX_LENGTH)
    .transform((value) => (value ? value : null)),
})

const StreetSearchSchema = z.object({
  settlementRef: z.string().trim().min(1).max(DIRECTORY_REF_MAX_LENGTH),
  search: z.string().trim().max(SEARCH_MAX_LENGTH),
})

const PointSearchSchema = z.object({
  settlementRef: z.string().trim().min(1).max(DIRECTORY_REF_MAX_LENGTH),
  kind: z.enum([DeliveryKind.Branch, DeliveryKind.Locker]),
  search: z.string().trim().max(SEARCH_MAX_LENGTH),
  parcelWeightGrams: z.number().int().min(0),
})

// The admin settles branches of the one domestic carrier.
const DIRECTORY_CARRIER = Carrier.NovaPost
const DIRECTORY_COUNTRY = 'UA'

const InvoiceSchema = z.object({
  orderId: z.uuid(),
  invoiceNumber: emptyToNull(80),
})

export async function updateOrderStatusAction(
  input: unknown,
): Promise<ActionResult<StatusChangeOutcome>> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  const parsed = OrderStatusSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION_FAILED', 'Unknown order or status.')

  try {
    const outcome = await orderAdminService.changeStatus(parsed.data.orderId, parsed.data.status)
    return actionOk(outcome)
  } catch (error) {
    return toActionError(error)
  }
}

export async function saveOrderTrackingAction(input: unknown): Promise<ActionResult<null>> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  const parsed = TrackingSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION_FAILED', 'trackingUrl')

  try {
    await orderAdminService.saveTracking(parsed.data.orderId, {
      carrier: parsed.data.carrier,
      trackingNumber: parsed.data.trackingNumber,
      trackingUrl: parsed.data.trackingUrl,
    })
    return actionOk(null)
  } catch (error) {
    return toActionError(error)
  }
}

export async function saveOrderInvoiceAction(input: unknown): Promise<ActionResult<null>> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  const parsed = InvoiceSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION_FAILED', 'invoiceNumber')

  try {
    await orderAdminService.saveInvoiceNumber(parsed.data.orderId, parsed.data.invoiceNumber)
    return actionOk(null)
  } catch (error) {
    return toActionError(error)
  }
}

export async function issueWaybillAction(input: unknown): Promise<ActionResult<IssuedWaybill>> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  const parsed = WaybillSchema.safeParse(input)
  if (!parsed.success) {
    return actionError('VALIDATION_FAILED', String(parsed.error.issues[0]?.path[0] ?? ''))
  }

  try {
    const { orderId, weightGrams, cargoDescription, carrierAccountId } = parsed.data
    const issued = await orderShipmentService.issueWaybill(
      orderId,
      { weightGrams, description: cargoDescription },
      {
        issuedBy: session.email,
        accountId: carrierAccountId ?? null,
        prepaidCents: optionalKopiykas(parsed.data.prepaidHryvnias),
      },
    )
    return actionOk(issued)
  } catch (error) {
    return toActionError(error)
  }
}

export async function removeWaybillAction(input: unknown): Promise<ActionResult<null>> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  const parsed = OrderIdSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION_FAILED', 'Unknown order.')

  try {
    await orderShipmentService.removeWaybill(parsed.data.orderId)
    return actionOk(null)
  } catch (error) {
    return toActionError(error)
  }
}

const PrepaymentSchema = z.object({ orderId: z.uuid(), prepaidHryvnias })

function optionalKopiykas(hryvnias: number | undefined): number | undefined {
  return hryvnias === undefined ? undefined : hryvniasToKopiykas(hryvnias)
}

export async function setOrderPrepaymentAction(input: unknown): Promise<ActionResult<null>> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  const parsed = PrepaymentSchema.safeParse(input)
  if (!parsed.success) {
    return actionError('VALIDATION_FAILED', 'prepaidHryvnias', 'целое число гривен')
  }

  try {
    const { orderId, prepaidHryvnias } = parsed.data
    await orderShipmentService.setPrepayment(orderId, hryvniasToKopiykas(prepaidHryvnias))
    return actionOk(null)
  } catch (error) {
    return toActionError(error)
  }
}

// One click of the daily round; the carrier answers in a second or two per
// parcel, so a batch stays small enough to finish inside the request.
const WAYBILL_BATCH_MAX = 10

const WaybillBatchSchema = z.object({
  orderIds: z.array(z.uuid()).min(1).max(WAYBILL_BATCH_MAX),
})

export async function issueWaybillBatchAction(
  input: unknown,
): Promise<ActionResult<WaybillBatchOutcome[]>> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  const parsed = WaybillBatchSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION_FAILED', 'Unknown orders.')

  try {
    return actionOk(
      await orderShipmentService.issueWaybillBatch(parsed.data.orderIds, session.email),
    )
  } catch (error) {
    return toActionError(error)
  }
}

export async function archiveReturnAction(input: unknown): Promise<ActionResult<null>> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  const parsed = OrderIdSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION_FAILED', 'Unknown order.')

  try {
    await orderAdminService.archiveReturn(parsed.data.orderId, new Date())
    return actionOk(null)
  } catch (error) {
    return toActionError(error)
  }
}

const MonthSchema = z.object({ month: z.string().refine(isMonthKey) })

// Read on demand, when the admin opens the statistics and picks a month.
export async function getMonthReturnsAction(
  input: unknown,
): Promise<ActionResult<MonthReturnsView>> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  const parsed = MonthSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION_FAILED', 'month')

  try {
    return actionOk(await getMonthReturns(parsed.data.month))
  } catch (error) {
    return toActionError(error)
  }
}

const WeekSchema = z.object({ week: z.string().refine(isWeekKey) })

// Read on demand, when the admin opens the sources and picks a week.
export async function getWeekTrafficAction(input: unknown): Promise<ActionResult<TrafficWeekView>> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  const parsed = WeekSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION_FAILED', 'week')

  try {
    return actionOk(await getWeekTraffic(parsed.data.week))
  } catch (error) {
    return toActionError(error)
  }
}

export async function settleOrderRecipientAction(input: unknown): Promise<ActionResult<null>> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  const parsed = RecipientSchema.safeParse(input)
  if (!parsed.success) {
    return actionError('VALIDATION_FAILED', String(parsed.error.issues[0]?.path[0] ?? ''))
  }

  try {
    const { orderId, ...recipient } = parsed.data
    await orderShipmentService.settleRecipient(orderId, recipient)
    return actionOk(null)
  } catch (error) {
    return toActionError(error)
  }
}

export async function findAdminSettlementsAction(
  input: unknown,
): Promise<ActionResult<Settlement[]>> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  const parsed = SettlementSearchSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION_FAILED', 'search')

  try {
    const directory = pickupDirectoryFor(DIRECTORY_CARRIER)
    return actionOk(await directory.findSettlements(DIRECTORY_COUNTRY, parsed.data.search))
  } catch (error) {
    return toActionError(error)
  }
}

export async function findAdminPickupPointsAction(
  input: unknown,
): Promise<ActionResult<PickupPointsResult>> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  const parsed = PointSearchSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION_FAILED', 'search')

  try {
    const directory = pickupDirectoryFor(DIRECTORY_CARRIER)
    return actionOk(
      await directory.findPickupPoints({
        ...parsed.data,
        carrier: DIRECTORY_CARRIER,
        country: DIRECTORY_COUNTRY,
      }),
    )
  } catch (error) {
    return toActionError(error)
  }
}

export async function issueCourierWaybillAction(
  input: unknown,
): Promise<ActionResult<IssuedWaybill>> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  const parsed = CourierWaybillSchema.safeParse(input)
  if (!parsed.success) {
    return actionError('VALIDATION_FAILED', String(parsed.error.issues[0]?.path[0] ?? ''))
  }

  try {
    const { orderId, weightGrams, cargoDescription, carrierAccountId, prepaidHryvnias, ...door } =
      parsed.data
    const issued = await orderShipmentService.issueCourierWaybill(
      orderId,
      { weightGrams, description: cargoDescription },
      {
        door,
        issuedBy: session.email,
        accountId: carrierAccountId ?? null,
        prepaidCents: optionalKopiykas(prepaidHryvnias),
      },
    )
    return actionOk(issued)
  } catch (error) {
    return toActionError(error)
  }
}

export async function findAdminStreetsAction(input: unknown): Promise<ActionResult<Street[]>> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  const parsed = StreetSearchSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION_FAILED', 'search')

  try {
    const directory = pickupDirectoryFor(DIRECTORY_CARRIER)
    return actionOk(await directory.findStreets(parsed.data.settlementRef, parsed.data.search))
  } catch (error) {
    return toActionError(error)
  }
}
