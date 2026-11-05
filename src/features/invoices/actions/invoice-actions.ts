'use server'

import { z } from 'zod'
import { readAdminSession } from '@/features/admin'
import { validationFailed } from '@/features/admin/model/validation-hints'
import { invoiceService } from '@/features/invoices/services/invoice-service'
import { actionError, actionOk, toActionError, type ActionResult } from '@/lib/action-result'
import { isValidTaxId } from '@/lib/tax-id'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null)

const IssueSchema = z.object({
  orderId: z.uuid(),
  buyerName: z.string().trim().min(3).max(200),
  // A buyer from the site may be a unit or a fund without a code at hand.
  taxId: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || isValidTaxId(value),
      'нужен ЄДРПОУ из 8 цифр или РНОКПП из 10 с верной контрольной цифрой',
    )
    .transform((value) => value || null),
  address: optionalText(300),
  phone: optionalText(32),
  validUntil: z.string().regex(ISO_DATE),
})

const VoidSchema = z.object({ invoiceId: z.uuid() })

export async function issueInvoiceAction(input: unknown): Promise<ActionResult<number>> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  const parsed = IssueSchema.safeParse(input)
  if (!parsed.success) return validationFailed(parsed.error)

  const { orderId, buyerName, taxId, address, phone, validUntil } = parsed.data
  try {
    const invoice = await invoiceService.issue(
      orderId,
      { buyer: { name: buyerName, taxId, address, phone }, validUntil },
      new Date(),
    )
    return actionOk(invoice.number)
  } catch (error) {
    return toActionError(error)
  }
}

export async function voidInvoiceAction(input: unknown): Promise<ActionResult<number>> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  const parsed = VoidSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION_FAILED', 'invoiceId')

  try {
    const invoice = await invoiceService.void(parsed.data.invoiceId)
    return actionOk(invoice.number)
  } catch (error) {
    return toActionError(error)
  }
}
