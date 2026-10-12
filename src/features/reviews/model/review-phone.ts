import { toUkrainianMsisdn } from '@/lib/phone'

// The hidden phone of a site review, as the SMS gateway keeps numbers:
// 380XXXXXXXXX digits, or null when the input is not a Ukrainian number.
export function reviewPhoneDigitsOf(raw: string | undefined): string | null {
  if (!raw) return null
  return toUkrainianMsisdn(raw)
}

// An order keeps the digits of the phone exactly as the buyer typed them,
// so the same number may sit there as 380…, 80… or 0…; the «Купив у нас»
// check has to ask for all three.
export function orderPhoneVariantsOf(msisdn: string): readonly string[] {
  const national = msisdn.replace(/^380/, '')
  return [msisdn, `80${national}`, `0${national}`]
}

const MASK_VISIBLE_HEAD = 5
const MASK_VISIBLE_TAIL = 2

// «+380 67 ••• •• 21»: enough for the admin to recognise a caller, not
// enough to dial.
export function maskPhoneDigits(digits: string): string {
  const head = digits.slice(0, MASK_VISIBLE_HEAD)
  const tail = digits.slice(-MASK_VISIBLE_TAIL)
  return `+${head.slice(0, 3)} ${head.slice(3)} ••• •• ${tail}`
}
