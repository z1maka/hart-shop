import { TrafficSource } from '@/db/enums'

// The channel a buyer came from, in the admin's language.
export const TRAFFIC_SOURCE_LABELS: Record<TrafficSource, string> = {
  [TrafficSource.GoogleAds]: 'Google Ads',
  [TrafficSource.Meta]: 'Meta (реклама)',
  [TrafficSource.Search]: 'Поиск',
  [TrafficSource.Social]: 'Соцсети',
  [TrafficSource.Tagged]: 'Другая метка',
  [TrafficSource.Referral]: 'Другие сайты',
  [TrafficSource.Direct]: 'Прямой заход',
}

// An order without a channel: the buyer refused tracking, or it was placed
// before the shop recorded one.
export const UNKNOWN_TRAFFIC_LABEL = 'Неизвестно'

export function trafficLabel(
  traffic: { readonly source: TrafficSource; readonly detail: string | null } | null,
): string {
  if (!traffic) return UNKNOWN_TRAFFIC_LABEL
  const channel = TRAFFIC_SOURCE_LABELS[traffic.source]
  return traffic.detail ? `${channel} · ${traffic.detail}` : channel
}
