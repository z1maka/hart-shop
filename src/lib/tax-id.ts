// Ukrainian taxpayer codes on invoices and partner cards: a company's ЄДРПОУ
// (8 digits) or an individual's РНОКПП (10 digits, a ФОП's too).

export const TaxIdKind = {
  // A company's code in the state register.
  Edrpou: 'edrpou',
  // An individual's (and so a ФОП's) taxpayer number.
  Rnokpp: 'rnokpp',
} as const
export type TaxIdKind = (typeof TaxIdKind)[keyof typeof TaxIdKind]

const EDRPOU_LENGTH = 8
const RNOKPP_LENGTH = 10
const DIGITS_ONLY = /^\d+$/
// The state's weights for the first nine digits of a РНОКПП; the tenth is
// their sum modulo 11, then modulo 10.
const RNOKPP_WEIGHTS = [-1, 5, 7, 9, 4, 6, 10, 5, 7] as const
const RNOKPP_MODULUS = 11
const DECIMAL = 10

export function taxIdKindOf(taxId: string): TaxIdKind | null {
  if (!DIGITS_ONLY.test(taxId)) return null
  if (taxId.length === EDRPOU_LENGTH) return TaxIdKind.Edrpou
  if (taxId.length === RNOKPP_LENGTH) return TaxIdKind.Rnokpp
  return null
}

// The label the invoice prints before the code.
export function taxIdLabel(taxId: string): string {
  return taxIdKindOf(taxId) === TaxIdKind.Edrpou ? 'ЄДРПОУ' : 'РНОКПП'
}

export function hasValidRnokppCheckDigit(taxId: string): boolean {
  if (taxIdKindOf(taxId) !== TaxIdKind.Rnokpp) return false

  const digits = [...taxId].map(Number)
  const weighted = RNOKPP_WEIGHTS.reduce(
    (sum, weight, index) => sum + weight * (digits[index] ?? 0),
    0,
  )
  const expected = (((weighted % RNOKPP_MODULUS) + RNOKPP_MODULUS) % RNOKPP_MODULUS) % DECIMAL
  return expected === digits[RNOKPP_LENGTH - 1]
}

// An ЄДРПОУ is taken as typed; a РНОКПП must carry its check digit, which
// catches the usual slip of one wrong or swapped digit.
export function isValidTaxId(taxId: string): boolean {
  const kind = taxIdKindOf(taxId)
  if (kind === TaxIdKind.Edrpou) return true
  return kind === TaxIdKind.Rnokpp && hasValidRnokppCheckDigit(taxId)
}
