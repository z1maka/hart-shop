export const Currency = {
  Eur: 'EUR',
  Uah: 'UAH',
} as const

export type Currency = (typeof Currency)[keyof typeof Currency]

export type Money = {
  readonly amountCents: number
  readonly currency: Currency
}

const MONEY_LOCALE = 'uk-UA'
const CENTS_PER_UNIT = 100

const formatters = new Map<Currency, Intl.NumberFormat>()
const wholeFormatters = new Map<Currency, Intl.NumberFormat>()

export function createMoney(amountCents: number, currency: Currency): Money {
  if (!Number.isInteger(amountCents)) {
    throw new Error(`Money must be an integer amount of cents, got ${amountCents}`)
  }
  return { amountCents, currency }
}

export function zeroMoney(currency: Currency): Money {
  return { amountCents: 0, currency }
}

export function addMoney(first: Money, second: Money): Money {
  assertSameCurrency(first, second)
  return { amountCents: first.amountCents + second.amountCents, currency: first.currency }
}

export function subtractMoney(minuend: Money, subtrahend: Money): Money {
  assertSameCurrency(minuend, subtrahend)
  return { amountCents: minuend.amountCents - subtrahend.amountCents, currency: minuend.currency }
}

export function multiplyMoney(money: Money, factor: number): Money {
  if (!Number.isFinite(factor)) {
    throw new Error(`Money multiplier must be a finite number, got ${factor}`)
  }
  return { amountCents: Math.round(money.amountCents * factor), currency: money.currency }
}

export function sumMoney(amounts: readonly Money[], currency: Currency): Money {
  return amounts.reduce((total, amount) => addMoney(total, amount), zeroMoney(currency))
}

export function formatMoney(money: Money): string {
  return getFormatter(money.currency).format(money.amountCents / CENTS_PER_UNIT)
}

// Whole hryvnias for dashboards, where kopiykas are noise: «28 650 ₴».
export function formatWholeMoney(money: Money): string {
  return getWholeFormatter(money.currency).format(Math.round(money.amountCents / CENTS_PER_UNIT))
}

// The amount as a bare decimal — what schema.org markup and a banking app's
// amount field take: no grouping, no currency sign.
export function decimalAmount(amountCents: number): string {
  return (amountCents / CENTS_PER_UNIT).toFixed(2)
}

function getFormatter(currency: Currency): Intl.NumberFormat {
  const cached = formatters.get(currency)
  if (cached) return cached

  const formatter = new Intl.NumberFormat(MONEY_LOCALE, { style: 'currency', currency })
  formatters.set(currency, formatter)
  return formatter
}

function getWholeFormatter(currency: Currency): Intl.NumberFormat {
  const cached = wholeFormatters.get(currency)
  if (cached) return cached

  const formatter = new Intl.NumberFormat(MONEY_LOCALE, {
    style: 'currency',
    currency,
    // The browser's ICU writes «грн» where Node writes «₴»; the narrow symbol
    // is «₴» in both, so a client chart reads like the server page around it.
    currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: 0,
  })
  wholeFormatters.set(currency, formatter)
  return formatter
}

function assertSameCurrency(first: Money, second: Money): void {
  if (first.currency !== second.currency) {
    throw new Error(`Cannot mix currencies: ${first.currency} and ${second.currency}`)
  }
}
