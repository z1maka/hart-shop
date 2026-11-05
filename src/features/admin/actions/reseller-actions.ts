'use server'

import { z } from 'zod'
import { validationFailed } from '@/features/admin/model/validation-hints'
import { readAdminSession } from '@/features/admin/session-cookie'
import { ResellerDraftSchema, resellerService } from '@/features/resellers'
import { actionError, actionOk, toActionError, type ActionResult } from '@/lib/action-result'
import { logger } from '@/lib/logger'

const EditSchema = ResellerDraftSchema.extend({ id: z.uuid() })
const ActiveSchema = z.object({ id: z.uuid(), isActive: z.boolean() })

// Returns the new partner's id: the order form picks them right away.
export async function addResellerAction(input: unknown): Promise<ActionResult<string>> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  const parsed = ResellerDraftSchema.safeParse(input)
  if (!parsed.success) return validationFailed(parsed.error)

  try {
    const id = await resellerService.add(parsed.data)
    logger.info('Reseller added', { admin: session.email, id })
    return actionOk(id)
  } catch (error) {
    return toActionError(error)
  }
}

export async function updateResellerAction(input: unknown): Promise<ActionResult<null>> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  const parsed = EditSchema.safeParse(input)
  if (!parsed.success) return validationFailed(parsed.error)

  try {
    const { id, ...draft } = parsed.data
    await resellerService.edit(id, draft)
    logger.info('Reseller edited', { admin: session.email, id })
    return actionOk(null)
  } catch (error) {
    return toActionError(error)
  }
}

export async function setResellerActiveAction(input: unknown): Promise<ActionResult<null>> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  const parsed = ActiveSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION_FAILED', 'id')

  try {
    await resellerService.setActive(parsed.data.id, parsed.data.isActive)
    logger.info('Reseller switched', { admin: session.email, ...parsed.data })
    return actionOk(null)
  } catch (error) {
    return toActionError(error)
  }
}
