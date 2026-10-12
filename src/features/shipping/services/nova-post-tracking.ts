import { z } from 'zod'
import { Carrier } from '@/db/enums'
import { COMPANY } from '@/config/company'
import { novaPostParcelStage, type ParcelStatus } from '@/features/shipping/model/parcel-tracking'
import { CarrierAnswerMalformedError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { novaPoshtaCall } from '@/lib/nova-post'

// Their limit for one tracking call.
const TRACK_BATCH_SIZE = 100
const TRACK_METHOD = 'TrackingDocument.getStatusDocuments'

const TrackedDocumentsSchema = z.array(
  z.object({
    Number: z.string().min(1),
    StatusCode: z.coerce.string(),
    Status: z.string().default(''),
  }),
)

// The sender's phone opens the full answer for the shop's own waybills;
// without it the carrier warns on every document.
export async function trackNovaPostParcels(
  numbers: readonly string[],
  apiKey?: string,
): Promise<ParcelStatus[]> {
  const batches = Array.from({ length: Math.ceil(numbers.length / TRACK_BATCH_SIZE) }, (_, index) =>
    numbers.slice(index * TRACK_BATCH_SIZE, (index + 1) * TRACK_BATCH_SIZE),
  )
  const answers = await Promise.all(batches.map((batch) => trackBatch(batch, apiKey)))
  return answers.flat()
}

async function trackBatch(
  numbers: readonly string[],
  apiKey: string | undefined,
): Promise<ParcelStatus[]> {
  const phone = COMPANY.phone.replace(/\D/g, '')
  const data = await novaPoshtaCall(
    'TrackingDocument',
    'getStatusDocuments',
    { Documents: numbers.map((number) => ({ DocumentNumber: number, Phone: phone })) },
    apiKey,
  )

  const parsed = TrackedDocumentsSchema.safeParse(data)
  if (!parsed.success) {
    logger.error('Nova Poshta answered in an unexpected shape', {
      method: TRACK_METHOD,
      issues: parsed.error.issues,
    })
    throw new CarrierAnswerMalformedError(Carrier.NovaPost, TRACK_METHOD)
  }

  return parsed.data.map((document) => ({
    number: document.Number,
    stage: novaPostParcelStage(document.StatusCode),
    statusText: document.Status,
  }))
}
