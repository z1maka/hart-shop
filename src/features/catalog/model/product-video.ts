export const VideoKind = {
  // The fabric under a thermal camera or a drone — what the page promises.
  Test: 'test',
  // A look at the product itself.
  Overview: 'overview',
} as const

export type VideoKind = (typeof VideoKind)[keyof typeof VideoKind]

// A YouTube video shown on a product page: the workshop's own tests and
// reviews, with the shop's caption rather than the video's title (most were
// published under the old shop name). Date and length come from YouTube and
// are kept here because Google's video markup requires them.
export type ProductVideo = {
  readonly youtubeId: string
  readonly caption: string
  readonly kind: VideoKind
  readonly durationSeconds: number
  // ISO 8601 with offset, as YouTube reports it.
  readonly uploadDate: string
}

// The one video the description's shortcut offers: a test first, since a
// buyer wants to see the fabric work; a page without tests offers its lead
// video.
export function featuredVideoOf(videos: readonly ProductVideo[]): ProductVideo | undefined {
  return videos.find((video) => video.kind === VideoKind.Test) ?? videos[0]
}

const SECONDS_PER_MINUTE = 60

// «1:36» under a thumbnail.
export function clockDuration(seconds: number): string {
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE)
  const rest = seconds % SECONDS_PER_MINUTE
  return `${minutes}:${String(rest).padStart(2, '0')}`
}

// «PT1M36S» for schema.org.
export function isoDuration(seconds: number): string {
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE)
  const rest = seconds % SECONDS_PER_MINUTE
  return `PT${minutes > 0 ? `${minutes}M` : ''}${rest}S`
}

export function youtubeThumbnailUrl(youtubeId: string): string {
  return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`
}

// The privacy-enhanced host: no YouTube cookies until the buyer presses play.
export function youtubePlayerUrl(youtubeId: string): string {
  return `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0`
}

export function youtubeEmbedUrl(youtubeId: string): string {
  return `https://www.youtube.com/embed/${youtubeId}`
}
