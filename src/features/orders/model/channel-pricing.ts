import { SalesChannel } from '@/db/enums'
import { unitPriceCentsFor, type PricedProduct } from '@/features/catalog/model/pricing'

// How a line is priced depends on who the order is for: a site buyer pays the
// cart's price (sale and the wholesale tier included), a partner the drop
// price whatever the quantity. One strategy per channel, so no code path asks
// which channel it is in.

export type ChannelPricedProduct = PricedProduct & {
  readonly dropPriceCents: number | null
}

// The product's unit price, before the variant's surcharge, when `quantity`
// of it are in the order; null when the channel cannot sell it (a partner
// order for a product without a drop price).
export type LinePricing = (product: ChannelPricedProduct, quantity: number) => number | null

const LINE_PRICING: Readonly<Record<SalesChannel, LinePricing>> = {
  [SalesChannel.Site]: (product, quantity) => unitPriceCentsFor(product, quantity),
  [SalesChannel.Dropship]: (product) => product.dropPriceCents,
}

export function linePricingFor(channel: SalesChannel): LinePricing {
  return LINE_PRICING[channel]
}

// One unit of a variant as a picker lists it: the site's single-unit price
// and the partner's, each with the variant's surcharge.
export type ListedPrices = {
  readonly retailCents: number
  readonly dropCents: number | null
}

const LISTED_PRICE: Readonly<Record<SalesChannel, (prices: ListedPrices) => number | null>> = {
  [SalesChannel.Site]: (prices) => prices.retailCents,
  [SalesChannel.Dropship]: (prices) => prices.dropCents,
}

// What one unit costs in an order of this channel, as the picker shows it.
export function listedUnitPriceCents(channel: SalesChannel, prices: ListedPrices): number | null {
  return LISTED_PRICE[channel](prices)
}

export function isSalesChannel(value: string): value is SalesChannel {
  return Object.values<string>(SalesChannel).includes(value)
}

// Messages, reminders and ad conversions go to the site's own buyers only:
// a partner sells under their own name, and their customer never hears
// from the shop.
export function writesToRecipient(channel: string): boolean {
  return channel === SalesChannel.Site
}
