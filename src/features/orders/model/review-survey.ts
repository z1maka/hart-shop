// What Google Customer Reviews needs to offer the buyer its survey about the
// shop: Google writes to them after the estimated delivery date, so the
// offer only makes sense for an order that left an email.
export type ReviewSurvey = {
  readonly orderId: string
  readonly email: string
  readonly deliveryCountry: string
  // YYYY-MM-DD, as Google's opt-in takes it.
  readonly estimatedDeliveryDate: string
}

export type ReviewSurveyOrder = {
  readonly orderNumber: string
  readonly email: string | null
  readonly country: string
  // The day the order was placed, YYYY-MM-DD on the shop's clock.
  readonly placedDay: string
}

const SATURDAY = 6
const SUNDAY = 0

export function reviewSurveyOf(
  order: ReviewSurveyOrder,
  businessDays: number,
): ReviewSurvey | null {
  const email = order.email?.trim()
  if (!email) return null

  return {
    orderId: order.orderNumber,
    email,
    deliveryCountry: order.country,
    estimatedDeliveryDate: addBusinessDays(order.placedDay, businessDays),
  }
}

// Weekends do not count, as in the delivery times the shop gives Merchant
// Center. Days are stepped in UTC so a daylight-saving change never shifts
// the date.
export function addBusinessDays(dayKey: string, days: number): string {
  const day = new Date(`${dayKey}T00:00:00Z`)
  let remaining = days

  while (remaining > 0) {
    day.setUTCDate(day.getUTCDate() + 1)
    const weekday = day.getUTCDay()
    if (weekday !== SATURDAY && weekday !== SUNDAY) remaining -= 1
  }

  return day.toISOString().slice(0, dayKey.length)
}
