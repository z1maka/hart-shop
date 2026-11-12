import { SalesChannel, TrafficSource } from '@/db/enums'
import type { TrafficTouch } from '@/features/analytics/model/traffic-source'

// A sale agreed in Instagram Direct never reaches the site through the ad's
// tagged link: the buyer writes from the ad, and the order is placed for
// them. The admin names its channel by hand (owner, 12.11.2026: the shop
// must see which sales Instagram brought).

export const ChatSaleChannel = {
  InstagramDirectAd: 'instagram_direct_ad',
  InstagramDirect: 'instagram_direct',
} as const
export type ChatSaleChannel = (typeof ChatSaleChannel)[keyof typeof ChatSaleChannel]

export const ChatSaleBlock = {
  // A partner's order is the partner's sale.
  Partner: 'partner',
  // An order with a Google ad click is reported to Google Ads as that ad's
  // sale; naming another channel would contradict it.
  GoogleClick: 'google_click',
} as const
export type ChatSaleBlock = (typeof ChatSaleBlock)[keyof typeof ChatSaleBlock]

export type ChatSaleOrder = {
  readonly channel: string
  readonly googleClickId: string | null
}

// The same detail a tagged Instagram visit writes, so the order list and the
// channel stats count a chat sale with the ad's own.
const INSTAGRAM_DIRECT_DETAIL = 'Instagram · Direct'

export function chatSaleTouch(channel: ChatSaleChannel): TrafficTouch {
  const source =
    channel === ChatSaleChannel.InstagramDirectAd ? TrafficSource.Meta : TrafficSource.Social
  return { source, detail: INSTAGRAM_DIRECT_DETAIL }
}

export function chatSaleBlockOf(order: ChatSaleOrder): ChatSaleBlock | null {
  if (order.channel === SalesChannel.Dropship) return ChatSaleBlock.Partner
  if (order.googleClickId) return ChatSaleBlock.GoogleClick
  return null
}
