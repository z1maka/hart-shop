'use server'

import { z } from 'zod'
import { Carrier } from '@/db/enums'
import { readAdminSession } from '@/features/admin/session-cookie'
import {
  carrierAccountRepository,
  carrierAccounts,
  pickupDirectoryFor,
} from '@/features/shipping'
import { actionError, actionOk, toActionError, type ActionResult } from '@/lib/action-result'
import { logger } from '@/lib/logger'

const NameSchema = z.string().trim().min(2).max(60)
const KeySchema = z.string().trim().min(16).max(120)

const AddSchema = z.object({ name: NameSchema, apiKey: KeySchema })
const EditSchema = z.object({ id: z.uuid(), name: NameSchema })
const KeyReplaceSchema = z.object({ id: z.uuid(), apiKey: KeySchema })
const AccountSchema = z.object({ id: z.uuid() })
const ActiveSchema = z.object({ id: z.uuid(), isActive: z.boolean() })
// The label comes from the picker, which already shows the branch the way a
// human reads it; the directory row carries only refs and the branch name.
const WarehouseSchema = z.object({
  pointRef: z.string().trim().min(1).max(120),
  label: z.string().trim().min(1).max(200),
})

// A cabinet is added by its key alone: the key itself says who it can send
// as, so there is nothing else for the owner to copy across.
export async function addCarrierAccountAction(input: unknown): Promise<ActionResult<null>> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  const parsed = AddSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION_FAILED', 'Enter a name and a key.')

  try {
    const senders = await carrierAccounts.readCabinetSenders(parsed.data.apiKey)
    const sender = senders[0]
    const contact = sender?.contacts[0]
    if (!sender || !contact) {
      return actionError('VALIDATION_FAILED', 'This key has no sender in the cabinet.')
    }

    await carrierAccountRepository.create({
      carrier: Carrier.NovaPost,
      name: parsed.data.name,
      apiKey: parsed.data.apiKey,
      senderRef: sender.ref,
      senderContactRef: contact.ref,
      senderName: sender.name,
      senderPhone: contact.phone,
    })
    logger.info('Carrier cabinet added', { admin: session.email, sender: sender.name })

    return actionOk(null)
  } catch (error) {
    return toActionError(error)
  }
}

export async function renameCarrierAccountAction(input: unknown): Promise<ActionResult<null>> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  const parsed = EditSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION_FAILED', 'Enter a name.')

  try {
    const account = await carrierAccountRepository.findById(parsed.data.id)
    if (!account) return actionError('NOT_FOUND', 'No such cabinet.')

    await carrierAccountRepository.update(parsed.data.id, {
      name: parsed.data.name,
      senderRef: account.senderRef,
      senderContactRef: account.senderContactRef,
      senderName: account.senderName,
      senderPhone: account.senderPhone,
    })

    return actionOk(null)
  } catch (error) {
    return toActionError(error)
  }
}

// A rotated key is checked before it is stored, and the sender it can write
// as is read again: the cabinet may have been re-registered behind it.
export async function replaceCarrierKeyAction(input: unknown): Promise<ActionResult<null>> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  const parsed = KeyReplaceSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION_FAILED', 'Enter a key.')

  try {
    const senders = await carrierAccounts.readCabinetSenders(parsed.data.apiKey)
    const sender = senders[0]
    const contact = sender?.contacts[0]
    if (!sender || !contact) {
      return actionError('VALIDATION_FAILED', 'This key has no sender in the cabinet.')
    }

    const account = await carrierAccountRepository.findById(parsed.data.id)
    if (!account) return actionError('NOT_FOUND', 'No such cabinet.')

    await carrierAccountRepository.replaceKey(parsed.data.id, parsed.data.apiKey)
    await carrierAccountRepository.update(parsed.data.id, {
      name: account.name,
      senderRef: sender.ref,
      senderContactRef: contact.ref,
      senderName: sender.name,
      senderPhone: contact.phone,
    })
    logger.info('Carrier cabinet key replaced', { admin: session.email, id: parsed.data.id })

    return actionOk(null)
  } catch (error) {
    return toActionError(error)
  }
}

export async function makeCarrierAccountDefaultAction(
  input: unknown,
): Promise<ActionResult<null>> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  const parsed = AccountSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION_FAILED', 'No such cabinet.')

  try {
    const changed = await carrierAccountRepository.makeDefault(parsed.data.id, Carrier.NovaPost)
    if (!changed) return actionError('NOT_FOUND', 'No such cabinet.')
    logger.info('Carrier cabinet made default', { admin: session.email, id: parsed.data.id })

    return actionOk(null)
  } catch (error) {
    return toActionError(error)
  }
}

// The default cabinet cannot be switched off: something has to issue the
// next waybill. The repository refuses it, and so does this.
export async function setCarrierAccountActiveAction(input: unknown): Promise<ActionResult<null>> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  const parsed = ActiveSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION_FAILED', 'No such cabinet.')

  try {
    const changed = await carrierAccountRepository.setActive(parsed.data.id, parsed.data.isActive)
    if (!changed) {
      return actionError('VALIDATION_FAILED', 'Сначала назначьте кабинетом по умолчанию другой.')
    }

    return actionOk(null)
  } catch (error) {
    return toActionError(error)
  }
}

// One branch for the whole shop: the workshop packs in one place whichever
// cabinet writes the waybill.
export async function setSenderWarehouseAction(input: unknown): Promise<ActionResult<null>> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  const parsed = WarehouseSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION_FAILED', 'Choose a branch.')

  try {
    const [point] = await pickupDirectoryFor(Carrier.NovaPost).findPickupPointsByRefs([
      parsed.data.pointRef,
    ])
    if (!point) return actionError('NOT_FOUND', 'Branch is not in the directory.')

    await carrierAccounts.writeWarehouse({
      cityRef: point.settlementRef,
      warehouseRef: point.ref,
      label: parsed.data.label,
    })
    logger.info('Sender warehouse changed', { admin: session.email, ref: point.ref })

    return actionOk(null)
  } catch (error) {
    return toActionError(error)
  }
}
