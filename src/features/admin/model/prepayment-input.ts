import { hryvniasToKopiykas, kopiykasToHryvnias } from '@/features/admin/model/product-form'

// A prepayment is agreed over the phone as a round sum: whole hryvnias.
const WHOLE_HRYVNIAS_PATTERN = /^\d{1,7}$/

// The field as a form opens: the saved prepayment, or 0 when there is none,
// so a waybill without one needs no typing.
export function prepaidInput(prepaidCents: number): string {
  return String(kopiykasToHryvnias(prepaidCents))
}

// Whole hryvnias, or null while the field holds anything else. An emptied
// field means no prepayment.
export function parsePrepaidInput(input: string): number | null {
  const trimmed = input.trim()
  if (trimmed === '') return 0
  return WHOLE_HRYVNIAS_PATTERN.test(trimmed) ? Number(trimmed) : null
}

// The typed prepayment in kopiykas, or null when it cannot go on the
// waybill: not whole hryvnias, or nothing left for the carrier to collect.
export function typedPrepaidCents(input: string, totalCents: number): number | null {
  const hryvnias = parsePrepaidInput(input)
  if (hryvnias === null) return null
  const prepaidCents = hryvniasToKopiykas(hryvnias)
  return prepaidCents < totalCents ? prepaidCents : null
}
