export const VideoKind = {
  // The fabric under a thermal camera or a drone — what the page promises.
  Test: 'test',
  // A look at the product itself.
  Overview: 'overview',
} as const

export type VideoKind = (typeof VideoKind)[keyof typeof VideoKind]

export const VideoSource = {
  // A file in the shop's own media bucket, played by the browser.
  Hosted: 'hosted',
  // YouTube's privacy-enhanced player.
  YouTube: 'youtube',
} as const

export type VideoSource = (typeof VideoSource)[keyof typeof VideoSource]

// What every video carries, whoever plays it: the shop's caption, and the
// date and length Google's video markup requires.
type VideoFacts = {
  readonly caption: string
  readonly kind: VideoKind
  readonly durationSeconds: number
  // ISO 8601 with offset.
  readonly uploadDate: string
}

// Rows written before the shop hosted its own files carry no source.
export type YouTubeVideo = VideoFacts & {
  readonly source?: typeof VideoSource.YouTube
  readonly youtubeId: string
}

// The workshop's tests and reviews as files of our own: the clips first
// published on the old shop's channel, its logo covered by «Гарт».
export type HostedVideo = VideoFacts & {
  readonly source: typeof VideoSource.Hosted
  readonly fileKey: string
  readonly posterKey: string
}

// A video shown on a product page, as stored in products.videos.
export type ProductVideo = YouTubeVideo | HostedVideo

// What a page needs to show a video, whatever plays it.
export type VideoView = VideoFacts & {
  // Stable within a page: list keys and the description's shortcut.
  readonly id: string
  readonly source: VideoSource
  readonly thumbnailUrl: string
  // The iframe's page for YouTube, the file itself for a hosted video.
  readonly playerUrl: string
  // Where Google's video markup points.
  readonly markupUrl: { readonly embedUrl: string } | { readonly contentUrl: string }
}

export function videoViewOf(video: ProductVideo, mediaUrl: (key: string) => string): VideoView {
  const facts = {
    caption: video.caption,
    kind: video.kind,
    durationSeconds: video.durationSeconds,
    uploadDate: video.uploadDate,
  }

  if (video.source === VideoSource.Hosted) {
    const fileUrl = mediaUrl(video.fileKey)
    return {
      ...facts,
      id: video.fileKey,
      source: VideoSource.Hosted,
      thumbnailUrl: mediaUrl(video.posterKey),
      playerUrl: fileUrl,
      markupUrl: { contentUrl: fileUrl },
    }
  }

  return {
    ...facts,
    id: video.youtubeId,
    source: VideoSource.YouTube,
    thumbnailUrl: youtubeThumbnailUrl(video.youtubeId),
    playerUrl: youtubePlayerUrl(video.youtubeId),
    markupUrl: { embedUrl: youtubeEmbedUrl(video.youtubeId) },
  }
}

// The one video the description's shortcut offers: a test first, since a
// buyer wants to see the fabric work; a page without tests offers its lead
// video.
export function featuredVideoOf<T extends { readonly kind: VideoKind }>(
  videos: readonly T[],
): T | undefined {
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

function youtubeThumbnailUrl(youtubeId: string): string {
  return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`
}

// The privacy-enhanced host: no YouTube cookies until the buyer presses play.
function youtubePlayerUrl(youtubeId: string): string {
  return `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0`
}

function youtubeEmbedUrl(youtubeId: string): string {
  return `https://www.youtube.com/embed/${youtubeId}`
}
