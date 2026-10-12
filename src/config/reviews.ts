// When the shop asks a buyer how the product is: long enough after the
// parcel was handed over to have used it, not so long that the order is
// forgotten. One ask per order, never repeated.
export const REVIEW_REQUEST_AFTER_DAYS = 2
export const REVIEW_REQUEST_WITHIN_DAYS = 14

// The day hart's catalogue and reviews were copied from FOX Armor UA. Site
// reviews published before it were left on FOX's own site and the Prom.ua ones
// come from FOX's marketplace page: both stay on the page and in its summary,
// but Google's markup carries only reviews collected here from this day on.
export const OWN_REVIEWS_SINCE = new Date('2026-10-12T00:00:00+03:00')
