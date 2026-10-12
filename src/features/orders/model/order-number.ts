const ORDER_PREFIX = 'FOX'
const SEQUENCE_LENGTH = 6
const SEQUENCE_MODULO = 10 ** SEQUENCE_LENGTH

// Human-readable and unique enough to quote over the phone: the year plus a
// counter that wraps every million orders, which is a problem for a later decade.
export function formatOrderNumber(year: number, sequence: number): string {
  const wrapped = sequence % SEQUENCE_MODULO

  return `${ORDER_PREFIX}-${year}-${String(wrapped).padStart(SEQUENCE_LENGTH, '0')}`
}
