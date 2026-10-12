// A Ukrainian IBAN is UA, two check digits, the bank's six-digit MFO and a
// nineteen-character account (the IBAN registry allows letters there, banks
// mostly use digits) — 29 characters that the owner types by hand, so a
// single slipped character must be caught before a buyer sends money to it.
export const UA_IBAN_LENGTH = 29
const UA_IBAN = /^UA\d{8}[A-Z0-9]{19}$/
const IBAN_MODULUS = 97n
const LETTER_OFFSET = 55
const GROUP_SIZE = 4
const TAIL_LENGTH = 4

export function normalizeIban(raw: string): string {
  return raw.replace(/\s+/g, '').toUpperCase()
}

export function isValidUaIban(iban: string): boolean {
  if (!UA_IBAN.test(iban)) return false

  const rearranged = `${iban.slice(4)}${iban.slice(0, 4)}`
  const digits = [...rearranged]
    .map((char) => (/\d/.test(char) ? char : String(char.charCodeAt(0) - LETTER_OFFSET)))
    .join('')

  return BigInt(digits) % IBAN_MODULUS === 1n
}

// Grouped by four the way banks print it: easier to read aloud and to check
// against a statement than one unbroken line.
export function groupIban(iban: string): string {
  return iban.match(new RegExp(`.{1,${GROUP_SIZE}}`, 'g'))?.join(' ') ?? iban
}

// The bank's MFO is written into the IBAN itself, right after the check
// digits — the admin form fills it from there instead of asking twice.
export function mfoOfUaIban(iban: string): string {
  return iban.slice(4, 10)
}

// The last digits, the way people tell accounts apart without reading the
// whole number aloud.
export function ibanTail(iban: string): string {
  return iban.slice(-TAIL_LENGTH)
}
