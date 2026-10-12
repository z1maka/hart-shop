import { decimalAmount } from '@/lib/money'

const WHOLE_AMOUNT_SUFFIX = '.00'

export type TransferDetail = {
  readonly key: string
  readonly label: string
  readonly value: string
  // What the buyer pastes into a banking app; absent for rows nobody types.
  readonly copyValue?: string
  // What the forwarded text says when neither of the above reads well there.
  readonly summaryValue?: string
  // Digits read against a statement group better in a fixed-width face.
  readonly isMonospace?: boolean
}

// What a banking app's amount field takes. Every price in the shop is whole
// hryvnias, and a bare integer pastes the same whichever decimal separator
// the app expects; kopecks, should there ever be any, keep the dot.
export function transferAmountText(amountCents: number): string {
  const decimal = decimalAmount(amountCents)

  return decimal.endsWith(WHOLE_AMOUNT_SUFFIX)
    ? decimal.slice(0, -WHOLE_AMOUNT_SUFFIX.length)
    : decimal
}

// The whole block as text, for a buyer who forwards it to whoever pays: the
// paste-ready value where a row has one, so the IBAN arrives without spaces.
export function transferSummary(details: readonly TransferDetail[]): string {
  return details
    .map((detail) => `${detail.label}: ${detail.summaryValue ?? detail.copyValue ?? detail.value}`)
    .join('\n')
}
