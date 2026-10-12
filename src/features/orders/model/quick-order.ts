// An order from the cart's phone-only panel carries no recipient and no
// branch yet — a consultant calls to settle both. The pickup reference is
// the marker every later step (SMS, notifications) recognises it by.
export const QUICK_ORDER_POINT_REF = 'quick-order'

export function isQuickOrder(pickupPointRef: string | null): boolean {
  return pickupPointRef === QUICK_ORDER_POINT_REF
}
