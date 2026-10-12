'use server'

import { z } from 'zod'
import { EnquiryStatus } from '@/db/enums'
import { enquiryService } from '@/features/enquiries'
import { readAdminSession } from '@/features/admin/session-cookie'
import { actionError, actionOk, toActionError, type ActionResult } from '@/lib/action-result'

const EnquiryStatusSchema = z.object({
  enquiryId: z.uuid(),
  status: z.enum(Object.values(EnquiryStatus) as [EnquiryStatus, ...EnquiryStatus[]]),
})

export async function updateEnquiryStatusAction(input: unknown): Promise<ActionResult<null>> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  const parsed = EnquiryStatusSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION_FAILED', 'Unknown enquiry or status.')

  try {
    await enquiryService.changeStatus(parsed.data.enquiryId, parsed.data.status)
    return actionOk(null)
  } catch (error) {
    return toActionError(error)
  }
}
