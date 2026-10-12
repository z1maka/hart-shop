import { createMoney, Currency, type Money } from '@/lib/money'

export type CartLineInput = {
  readonly quantity: number
  readonly unitPriceCents: number
  readonly weightGrams: number
}

export type CartTotals = {
  readonly itemCount: number
  readonly lineCount: number
  readonly subtotal: Money
  readonly weightGrams: number
}

const MAX_LINE_QUANTITY = 99

export function calculateCartTotals(lines: readonly CartLineInput[]): CartTotals {
  for (const line of lines) {
    assertLine(line)
  }

  return {
    itemCount: lines.reduce((total, line) => total + line.quantity, 0),
    lineCount: lines.length,
    subtotal: createMoney(
      lines.reduce((total, line) => total + line.unitPriceCents * line.quantity, 0),
      Currency.Uah,
    ),
    weightGrams: lines.reduce((total, line) => total + line.weightGrams * line.quantity, 0),
  }
}

export function clampQuantity(quantity: number): number {
  if (!Number.isInteger(quantity)) {
    throw new Error(`Quantity must be a whole number, got ${quantity}`)
  }

  return Math.min(MAX_LINE_QUANTITY, Math.max(1, quantity))
}

function assertLine(line: CartLineInput): void {
  if (!Number.isInteger(line.quantity) || line.quantity < 1) {
    throw new Error(`Cart line quantity must be a positive integer, got ${line.quantity}`)
  }
  if (!Number.isInteger(line.unitPriceCents) || line.unitPriceCents < 0) {
    throw new Error(`Cart line price must be a non-negative integer, got ${line.unitPriceCents}`)
  }
  if (!Number.isInteger(line.weightGrams) || line.weightGrams < 0) {
    throw new Error(`Cart line weight must be a non-negative integer, got ${line.weightGrams}`)
  }
}
