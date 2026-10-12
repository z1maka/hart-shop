import { z } from 'zod'
import { env } from '@/lib/env'
import { CarrierRejectedError, CarrierUnavailableError } from '@/lib/errors'
import { logger } from '@/lib/logger'

// The domestic JSON API — the one waybills are created through, and the only
// one whose branch directory carries weight limits. Every call is a POST of
// model + method + properties under the business-cabinet key.
const NOVA_POSHTA_API = 'https://api.novaposhta.ua/v2.0/json/'
// Printing is a plain GET on their cabinet host with the key in the path; this
// is the 100×100 mm marking the shop's thermal printer takes.
const LABEL_100X100_URL = 'https://my.novaposhta.ua/orders/printMarking100x100/orders[]'
const CARRIER = 'nova_post'
const REQUEST_TIMEOUT_MS = 10_000
const RATE_LIMIT_ERROR = 'To many requests' // sic — their spelling
const RATE_LIMIT_RETRIES = 3
const RATE_LIMIT_PAUSE_MS = 1_100
const LOGGED_BODY_LENGTH = 300

// Plain strings for most methods; tracking keys each message by its
// document instead — [{ "ID_20450000000000": "…" }] — and those are read as
// their texts.
const MessagesSchema = z
  .array(z.union([z.string(), z.record(z.string(), z.unknown())]))
  .default([])
  .transform((messages) =>
    messages.flatMap((message) =>
      typeof message === 'string' ? [message] : Object.values(message).map(String),
    ),
  )

const EnvelopeSchema = z.object({
  success: z.boolean(),
  data: z.array(z.unknown()).default([]),
  errors: MessagesSchema,
  warnings: MessagesSchema,
  errorCodes: z.array(z.string()).default([]),
  // An object with the total for paged lists, an empty array otherwise.
  info: z.unknown(),
})

const PageInfoSchema = z.object({ totalCount: z.coerce.number().int().min(0) })

type Envelope = z.infer<typeof EnvelopeSchema>

// Scalars for most calls; a waybill carries its seats as a list of objects
// and a deletion a list of refs.
export type NovaPoshtaProperties = Record<
  string,
  string | readonly string[] | readonly Record<string, string>[]
>

export type NovaPoshtaPage = {
  readonly items: unknown[]
  readonly totalCount: number
}

type NovaPoshtaCall = {
  readonly model: string
  readonly method: string
  readonly properties: NovaPoshtaProperties
  // The cabinet the call belongs to; the env key when the shop still runs
  // on a single cabinet.
  readonly apiKey?: string
}

// A refusal that keeps their error codes, so a caller can tell "already
// deleted" from a real problem; to everyone else it is a CarrierRejectedError.
class NovaPoshtaRefusal extends CarrierRejectedError {
  readonly errorCodes: readonly string[]

  constructor(reasons: readonly string[], errorCodes: readonly string[]) {
    super(reasons)
    this.errorCodes = errorCodes
  }
}

export function isNovaPostConfigured(): boolean {
  return Boolean(env.NOVA_POST_API_KEY)
}

export async function novaPoshtaCall(
  model: string,
  method: string,
  properties: NovaPoshtaProperties,
  apiKey?: string,
): Promise<unknown[]> {
  const envelope = await successfulEnvelope({ model, method, properties, apiKey })
  return envelope.data
}

// A paged list answers with its total; the directory sync needs it to tell
// the last page from a page their side cut short.
export async function novaPoshtaPage(
  model: string,
  method: string,
  properties: NovaPoshtaProperties,
): Promise<NovaPoshtaPage> {
  const envelope = await successfulEnvelope({ model, method, properties })
  const info = PageInfoSchema.safeParse(envelope.info)
  if (!info.success) {
    logger.error('Nova Poshta page came without a total', { model, method })
    throw new CarrierUnavailableError(CARRIER, 0)
  }
  return { items: envelope.data, totalCount: info.data.totalCount }
}

// Their error codes for a refusal that means "already done", e.g. deleting a
// waybill that is no longer in the cabinet.
export function isNovaPoshtaErrorCode(error: unknown, code: string): boolean {
  return error instanceof NovaPoshtaRefusal && error.errorCodes.includes(code)
}

export async function novaPoshtaLabelPdf(
  documentNumber: string,
  cabinetKey?: string,
): Promise<ArrayBuffer> {
  const apiKey = cabinetKey ?? env.NOVA_POST_API_KEY
  if (!apiKey) throw new CarrierUnavailableError(CARRIER, 0)

  const url = `${LABEL_100X100_URL}/${encodeURIComponent(documentNumber)}/type/pdf/apiKey/${apiKey}`
  const response = await send(url, {}, { documentNumber })
  if (!response.ok) {
    logger.error('Nova Poshta label request failed', { documentNumber, status: response.status })
    throw new CarrierUnavailableError(CARRIER, response.status)
  }

  // A number the cabinet does not know comes back as an HTML page with a 200.
  const isPdf = response.headers.get('content-type')?.includes('application/pdf') ?? false
  if (!isPdf) {
    logger.error('Nova Poshta has no label for the document', { documentNumber })
    throw new CarrierRejectedError([`накладной ${documentNumber} нет в кабинете`])
  }
  return response.arrayBuffer()
}

async function successfulEnvelope(call: NovaPoshtaCall): Promise<Envelope> {
  const envelope = await postWithPatience(call, RATE_LIMIT_RETRIES)
  if (envelope.success) return envelope

  logger.error('Nova Poshta refused the call', {
    model: call.model,
    method: call.method,
    errors: envelope.errors,
    warnings: envelope.warnings,
    errorCodes: envelope.errorCodes,
  })
  // Still throttled after the retries is them being busy, not us being wrong.
  if (envelope.errors.includes(RATE_LIMIT_ERROR)) throw new CarrierUnavailableError(CARRIER, 0)
  const reasons = envelope.errors.length > 0 ? envelope.errors : envelope.warnings
  throw new NovaPoshtaRefusal(reasons, envelope.errorCodes)
}

// The directory methods allow roughly one call a second per key; a refusal
// for that reason is worth one more try after a pause, anything else is not.
async function postWithPatience(call: NovaPoshtaCall, retriesLeft: number): Promise<Envelope> {
  const envelope = await post(call)
  const isRateLimited = !envelope.success && envelope.errors.includes(RATE_LIMIT_ERROR)
  if (!isRateLimited || retriesLeft === 0) return envelope

  await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_PAUSE_MS))
  return postWithPatience(call, retriesLeft - 1)
}

async function post(call: NovaPoshtaCall): Promise<Envelope> {
  const apiKey = call.apiKey ?? env.NOVA_POST_API_KEY
  if (!apiKey) throw new CarrierUnavailableError(CARRIER, 0)

  const context = { model: call.model, method: call.method }
  const response = await send(
    NOVA_POSHTA_API,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey,
        modelName: call.model,
        calledMethod: call.method,
        methodProperties: call.properties,
      }),
    },
    context,
  )

  const body = await readBody(response, context)
  const envelope = response.ok ? EnvelopeSchema.safeParse(parseJson(body)) : null
  if (!envelope?.success) {
    logger.error('Nova Poshta answered in an unexpected shape', {
      ...context,
      status: response.status,
      issues: envelope?.error.issues,
      body: body.slice(0, LOGGED_BODY_LENGTH),
    })
    throw new CarrierUnavailableError(CARRIER, response.status)
  }
  return envelope.data
}

// A timeout or a dropped connection is their outage like any 5xx: the caller
// gets the domain error, not a raw TypeError it cannot tell from our own bug.
async function send(url: string, init: RequestInit, context: object): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
  } catch (error) {
    logger.error('Nova Poshta is unreachable', { ...context, error })
    throw new CarrierUnavailableError(CARRIER, 0)
  }
}

async function readBody(response: Response, context: object): Promise<string> {
  try {
    return await response.text()
  } catch (error) {
    logger.error('Nova Poshta answer was cut off', { ...context, error })
    throw new CarrierUnavailableError(CARRIER, response.status)
  }
}

function parseJson(body: string): unknown {
  try {
    return JSON.parse(body)
  } catch {
    // Their maintenance page is HTML; the caller logs the body it came from.
    return null
  }
}
