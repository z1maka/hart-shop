// The cart action errors the buyer reads in the shop's own words
// (messages addToCart.errors); any other code shows the server's message.
const CART_ERROR_CODES = [
  'OUT_OF_STOCK',
  'VARIANT_NOT_FOUND',
  'CART_NOT_FOUND',
  'VALIDATION_FAILED',
] as const

export type CartErrorCode = (typeof CART_ERROR_CODES)[number]

function isCartErrorCode(code: string): code is CartErrorCode {
  return CART_ERROR_CODES.some((known) => known === code)
}

export function cartErrorText(
  error: { readonly code: string; readonly message: string },
  wordFor: (code: CartErrorCode) => string,
): string {
  return isCartErrorCode(error.code) ? wordFor(error.code) : error.message
}
