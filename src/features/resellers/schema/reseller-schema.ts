import { z } from 'zod'
import { isValidUaIban, normalizeIban } from '@/lib/iban'
import { isValidTaxId } from '@/lib/tax-id'

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null)

// A partner as the admin types them in. The name and code go on invoices as
// they are, so the code is checked: 8 digits for a company, 10 with a valid
// check digit for a ФОП.
export const ResellerDraftSchema = z.object({
  name: z.string().trim().min(3).max(200),
  taxId: z.string().trim().refine(isValidTaxId),
  contactName: optionalText(120),
  phone: optionalText(32),
  email: z.union([z.literal(''), z.email()]).transform((value) => value || null),
  legalAddress: optionalText(300),
  payoutIban: z
    .string()
    .transform(normalizeIban)
    .refine((value) => value === '' || isValidUaIban(value))
    .transform((value) => value || null),
  contractRef: optionalText(120),
  note: optionalText(1000),
})

export type ResellerDraft = z.infer<typeof ResellerDraftSchema>
