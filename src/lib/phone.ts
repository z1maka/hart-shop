// The shop ships domestically, so only Ukrainian numbers are dialable.
// Returns the 380XXXXXXXXX form the SMS gateway and the order matcher expect,
// or null when the input cannot be a Ukrainian number — checkout accepts
// free-form phones.
export function toUkrainianMsisdn(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')

  if (/^380\d{9}$/.test(digits)) return digits
  if (/^80\d{9}$/.test(digits)) return `3${digits}`
  if (/^0\d{9}$/.test(digits)) return `38${digits}`
  return null
}

// A tap-to-call link for a buyer's phone, so the admin on a phone calls
// straight from the order. Null when the number cannot be dialled.
export function phoneCallHref(raw: string): string | null {
  const msisdn = toUkrainianMsisdn(raw)
  return msisdn ? `tel:+${msisdn}` : null
}
