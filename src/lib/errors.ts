export abstract class AppError extends Error {
  abstract readonly code: string

  constructor(message: string) {
    super(message)
    this.name = new.target.name
  }
}

export class ProductNotFoundError extends AppError {
  readonly code = 'PRODUCT_NOT_FOUND'

  constructor(slug: string) {
    super(`Product "${slug}" was not found`)
  }
}

export class VariantNotFoundError extends AppError {
  readonly code = 'VARIANT_NOT_FOUND'

  constructor(variantId: string) {
    super(`Variant "${variantId}" was not found`)
  }
}

export class CartNotFoundError extends AppError {
  readonly code = 'CART_NOT_FOUND'

  constructor(cartId: string) {
    super(`Cart "${cartId}" was not found`)
  }
}

export class OrderNotFoundError extends AppError {
  readonly code = 'ORDER_NOT_FOUND'

  constructor(reference: string) {
    super(`Order "${reference}" was not found`)
  }
}

export class CarrierUnavailableError extends AppError {
  readonly code = 'CARRIER_UNAVAILABLE'

  constructor(carrier: string, status: number) {
    super(`Carrier ${carrier} is not answering (status ${status})`)
  }
}

export class ParcelTooHeavyError extends AppError {
  readonly code = 'PARCEL_TOO_HEAVY'

  constructor(weightGrams: number, maxGrams: number) {
    super(`Parcel weighs ${weightGrams}g, carriers take up to ${maxGrams}g`)
  }
}

export class OutOfStockError extends AppError {
  readonly code = 'OUT_OF_STOCK'

  constructor(
    readonly variantId: string,
    readonly requested: number,
    readonly available: number,
  ) {
    super(`Variant "${variantId}": requested ${requested}, available ${available}`)
  }
}

export class PaymentFailedError extends AppError {
  readonly code = 'PAYMENT_FAILED'

  constructor(reason: string) {
    super(`Payment failed: ${reason}`)
  }
}

// A route the checkout no longer offers — the owner removed the last bank
// account while the buyer had the page open.
export class PaymentRouteUnavailableError extends AppError {
  readonly code = 'PAYMENT_ROUTE_UNAVAILABLE'

  constructor(route: string) {
    super(`Payment route "${route}" is not available`)
  }
}

export class UnauthorizedError extends AppError {
  readonly code = 'UNAUTHORIZED'

  constructor(message = 'Authentication required') {
    super(message)
  }
}

export class CategoryNotFoundError extends AppError {
  readonly code = 'CATEGORY_NOT_FOUND'

  constructor(slug: string) {
    super(`Category "${slug}" does not exist`)
  }
}

export class CategorySlugTakenError extends AppError {
  readonly code = 'CATEGORY_SLUG_TAKEN'

  constructor(slug: string) {
    super(`A category already uses the address "${slug}"`)
  }
}

export class ProductSlugTakenError extends AppError {
  readonly code = 'PRODUCT_SLUG_TAKEN'

  constructor(slug: string) {
    super(`A product already uses the address "${slug}"`)
  }
}

export class ProductSkuTakenError extends AppError {
  readonly code = 'PRODUCT_SKU_TAKEN'

  constructor(sku: string) {
    super(`A product already uses the SKU "${sku}"`)
  }
}

export class UnsupportedImageError extends AppError {
  readonly code = 'UNSUPPORTED_IMAGE'

  constructor(message: string) {
    super(message)
  }
}

export class OrderTransitionError extends AppError {
  readonly code = 'ORDER_TRANSITION_INVALID'

  constructor(from: string, to: string) {
    super(`Order cannot move from ${from} to ${to}`)
  }
}

export class EnquiryNotFoundError extends AppError {
  readonly code = 'ENQUIRY_NOT_FOUND'

  constructor(enquiryId: string) {
    super(`Enquiry ${enquiryId} not found`)
  }
}

export class ProductImageNotFoundError extends AppError {
  readonly code = 'IMAGE_NOT_FOUND'

  constructor(storageKey: string) {
    super(`Product image ${storageKey} not found`)
  }
}

// The carrier's own words go to the admin as they are; with none given the
// message stays empty and the panel says so in Russian.
export class CarrierRejectedError extends AppError {
  readonly code = 'CARRIER_REJECTED'

  constructor(reasons: readonly string[]) {
    super(reasons.join('; '))
  }
}

// Success on their side with an answer we cannot read: for a waybill that
// may mean it exists in the cabinet, so a blind retry could make a second.
export class CarrierAnswerMalformedError extends AppError {
  readonly code = 'CARRIER_ANSWER_MALFORMED'

  constructor(carrier: string, method: string) {
    super(`Carrier ${carrier} answered ${method} in an unexpected shape`)
  }
}

export class DirectorySyncIncompleteError extends AppError {
  readonly code = 'DIRECTORY_SYNC_INCOMPLETE'

  constructor(carrier: string, fetched: number, expected: number) {
    super(`Carrier ${carrier} directory sync got ${fetched} of ${expected} points`)
  }
}

export class PickupPointNotFoundError extends AppError {
  readonly code = 'PICKUP_POINT_NOT_FOUND'

  constructor(ref: string) {
    super(`Pick-up point "${ref}" is not in the directory`)
  }
}

export class WaybillNotIssuableError extends AppError {
  readonly code = 'WAYBILL_NOT_ISSUABLE'

  constructor(orderId: string, reason: string) {
    super(`Order ${orderId} cannot get a waybill from the admin: ${reason}`)
  }
}

export class WaybillAlreadyIssuedError extends AppError {
  readonly code = 'WAYBILL_ALREADY_ISSUED'

  constructor(orderId: string) {
    super(`Order ${orderId} already has a waybill`)
  }
}

export class WaybillLockedError extends AppError {
  readonly code = 'WAYBILL_LOCKED'

  constructor(orderId: string, status: string) {
    super(`Order ${orderId} in status ${status} cannot have its waybill changed`)
  }
}

// The order was sent or cancelled — before the admin's click, or while the
// carrier was answering it — so it takes no new recipient and no waybill.
export class WaybillOrderClosedError extends AppError {
  readonly code = 'WAYBILL_ORDER_CLOSED'

  constructor(orderId: string, status: string) {
    super(`Order ${orderId} in status ${status} takes no waybill`)
  }
}

// Only an open return can be closed; a second click, or an order that is
// not a return, finds nothing to move.
export class ReturnNotOpenError extends AppError {
  readonly code = 'RETURN_NOT_OPEN'

  constructor(orderId: string) {
    super(`Order ${orderId} is not an open return`)
  }
}

export class TrackingFromWaybillError extends AppError {
  readonly code = 'TRACKING_FROM_WAYBILL'

  constructor(orderId: string) {
    super(`Order ${orderId} tracking comes from its waybill and cannot be edited`)
  }
}

export class WaybillMissingError extends AppError {
  readonly code = 'WAYBILL_MISSING'

  constructor(orderId: string) {
    super(`Order ${orderId} has no waybill`)
  }
}

// The order sent does not match the categories that exist — someone added or
// removed one meanwhile; the admin reloads and drops again.
export class CategoryOrderStaleError extends AppError {
  readonly code = 'CATEGORY_ORDER_STALE'

  constructor() {
    super('The category order no longer matches the categories')
  }
}

export class BankAccountNotFoundError extends AppError {
  readonly code = 'BANK_ACCOUNT_NOT_FOUND'

  constructor(id: string) {
    super(`Bank account "${id}" was not found`)
  }
}

export class BankAccountIbanTakenError extends AppError {
  readonly code = 'BANK_ACCOUNT_IBAN_TAKEN'

  constructor() {
    super('This IBAN is already on the list')
  }
}

// The account the site shows cannot go: a buyer mid-payment would be left
// with nothing to pay to.
export class BankAccountActiveError extends AppError {
  readonly code = 'BANK_ACCOUNT_ACTIVE'

  constructor(id: string) {
    super(`Bank account "${id}" is the one shown on the site`)
  }
}

// A new waybill named a cabinet that is switched off, gone, or cannot write
// one (no sending branch yet). Existing waybills keep their own cabinet.
export class CarrierAccountUnavailableError extends AppError {
  readonly code = 'CARRIER_ACCOUNT_UNAVAILABLE'

  constructor(accountId: string) {
    super(`Carrier cabinet "${accountId}" cannot issue waybills`)
  }
}

export class ReviewNotFoundError extends AppError {
  readonly code = 'REVIEW_NOT_FOUND'

  constructor(reviewId: string) {
    super(`Review "${reviewId}" was not found`)
  }
}

// A Google API (sign-in or Analytics) did not answer, refused the service
// account, or sent what we cannot read. The admin stats show earnings
// without the ad spend then.
export class GoogleApiUnavailableError extends AppError {
  readonly code = 'GOOGLE_API_UNAVAILABLE'

  constructor(reason: string) {
    super(`Google API: ${reason}`)
  }
}
