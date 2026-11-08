import { dottedDate } from '@/features/invoices'
import { formatDateIsoKyiv } from '@/lib/datetime'
import { createMoney, Currency, formatMoney } from '@/lib/money'

export function moneyLabel(cents: number): string {
  return formatMoney(createMoney(cents, Currency.Uah))
}

// A sum that is unknown while a product has no cost entered.
export function knownMoneyLabel(cents: number | null): string {
  return cents === null ? '—' : moneyLabel(cents)
}

// «01.10.2026 — 31.10.2026», a single day once.
export function periodLabel(from: string, to: string): string {
  return from === to ? dottedDate(from) : `${dottedDate(from)} — ${dottedDate(to)}`
}

// «07.11.2026» on the shop's clock, as the act writes its dates.
export function dayLabel(value: Date): string {
  return dottedDate(formatDateIsoKyiv(value))
}
