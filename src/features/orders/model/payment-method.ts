// The acquirer's own name for each provider id an order can record. The
// admin looks for a card payment in that acquirer's cabinet and for a
// transfer in the shop's account statement, so the label names where the
// money went. A new acquirer adds its name here.
const CARD_PROVIDER_NAMES: Readonly<Record<string, string>> = {
  mono: 'plata by mono',
}

// An id this table does not know is shown as recorded rather than hidden.
export function cardProviderName(providerId: string | null): string | null {
  if (!providerId) return null
  return CARD_PROVIDER_NAMES[providerId] ?? providerId
}
