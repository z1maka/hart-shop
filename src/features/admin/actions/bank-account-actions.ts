'use server'

import { updateTag } from 'next/cache'
import { z } from 'zod'
import { BANK_REQUISITES_TAG, BankAccountDraftSchema } from '@/config/requisites'
import { validationFailed } from '@/features/admin/model/validation-hints'
import { readAdminSession } from '@/features/admin/session-cookie'
import { bankAccountService } from '@/features/billing'
import { actionError, actionOk, toActionError, type ActionResult } from '@/lib/action-result'
import { ibanTail } from '@/lib/iban'
import { logger } from '@/lib/logger'

const EditSchema = BankAccountDraftSchema.extend({ id: z.uuid() })
const AccountSchema = z.object({ id: z.uuid() })

export async function addBankAccountAction(input: unknown): Promise<ActionResult<null>> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  const parsed = BankAccountDraftSchema.safeParse(input)
  if (!parsed.success) return validationFailed(parsed.error)

  try {
    await bankAccountService.add(parsed.data)
    updateTag(BANK_REQUISITES_TAG)
    logger.info('Bank account added', {
      admin: session.email,
      ibanTail: ibanTail(parsed.data.iban),
    })

    return actionOk(null)
  } catch (error) {
    return toActionError(error)
  }
}

export async function updateBankAccountAction(input: unknown): Promise<ActionResult<null>> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  const parsed = EditSchema.safeParse(input)
  if (!parsed.success) return validationFailed(parsed.error)

  try {
    const { id, ...draft } = parsed.data
    await bankAccountService.edit(id, draft)
    updateTag(BANK_REQUISITES_TAG)
    logger.info('Bank account edited', { admin: session.email, id })

    return actionOk(null)
  } catch (error) {
    return toActionError(error)
  }
}

export async function activateBankAccountAction(input: unknown): Promise<ActionResult<null>> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  const parsed = AccountSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION_FAILED', 'id')

  try {
    await bankAccountService.activate(parsed.data.id)
    updateTag(BANK_REQUISITES_TAG)
    logger.info('Bank account activated', { admin: session.email, id: parsed.data.id })

    return actionOk(null)
  } catch (error) {
    return toActionError(error)
  }
}

export async function deleteBankAccountAction(input: unknown): Promise<ActionResult<null>> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  const parsed = AccountSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION_FAILED', 'id')

  try {
    await bankAccountService.remove(parsed.data.id)
    logger.info('Bank account deleted', { admin: session.email, id: parsed.data.id })

    return actionOk(null)
  } catch (error) {
    return toActionError(error)
  }
}

