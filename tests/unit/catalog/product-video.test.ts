import { describe, expect, it } from 'vitest'
import {
  clockDuration,
  featuredVideoOf,
  isoDuration,
  VideoKind,
  VideoSource,
  videoViewOf,
  type YouTubeVideo,
} from '@/features/catalog/model/product-video'

function video(youtubeId: string, kind: VideoKind): YouTubeVideo {
  return {
    youtubeId,
    caption: youtubeId,
    kind,
    durationSeconds: 60,
    uploadDate: '2025-05-06T14:59:54-07:00',
  }
}

describe('video durations', () => {
  it('prints minutes and zero-padded seconds under a thumbnail', () => {
    expect(clockDuration(96)).toBe('1:36')
    expect(clockDuration(15)).toBe('0:15')
    expect(clockDuration(60)).toBe('1:00')
  })

  it('writes ISO 8601 durations for the markup', () => {
    expect(isoDuration(96)).toBe('PT1M36S')
    expect(isoDuration(15)).toBe('PT15S')
    expect(isoDuration(120)).toBe('PT2M0S')
  })
})

describe('featured video', () => {
  it('offers the first test even when an overview leads the gallery', () => {
    const videos = [
      video('kit', VideoKind.Overview),
      video('drone', VideoKind.Test),
      video('camera', VideoKind.Test),
    ]

    expect(featuredVideoOf(videos)?.youtubeId).toBe('drone')
  })

  it('falls back to the lead video on a page without tests', () => {
    const videos = [video('kit', VideoKind.Overview), video('review', VideoKind.Overview)]

    expect(featuredVideoOf(videos)?.youtubeId).toBe('kit')
  })

  it('offers nothing on a page without videos', () => {
    expect(featuredVideoOf([])).toBeUndefined()
  })
})

describe('video view', () => {
  const mediaUrl = (key: string) => `https://media.hart-shop.com/${key}`

  it('reads a row without a source as a YouTube video', () => {
    const view = videoViewOf(video('oj3HwvDkAyc', VideoKind.Test), mediaUrl)

    expect(view).toMatchObject({
      id: 'oj3HwvDkAyc',
      source: VideoSource.YouTube,
      thumbnailUrl: 'https://i.ytimg.com/vi/oj3HwvDkAyc/hqdefault.jpg',
      markupUrl: { embedUrl: 'https://www.youtube.com/embed/oj3HwvDkAyc' },
    })
    expect(view.playerUrl).toContain('youtube-nocookie.com/embed/oj3HwvDkAyc')
  })

  it('plays a hosted video from the media bucket, poster included', () => {
    const view = videoViewOf(
      {
        source: VideoSource.Hosted,
        fileKey: 'videos/starlink-test-1a2b3c4d.mp4',
        posterKey: 'videos/starlink-test-1a2b3c4d.webp',
        caption: 'Тест чохла на Starlink з дрона',
        kind: VideoKind.Test,
        durationSeconds: 28,
        uploadDate: '2026-10-23T12:00:00+03:00',
      },
      mediaUrl,
    )

    expect(view).toMatchObject({
      id: 'videos/starlink-test-1a2b3c4d.mp4',
      source: VideoSource.Hosted,
      thumbnailUrl: 'https://media.hart-shop.com/videos/starlink-test-1a2b3c4d.webp',
      playerUrl: 'https://media.hart-shop.com/videos/starlink-test-1a2b3c4d.mp4',
      markupUrl: { contentUrl: 'https://media.hart-shop.com/videos/starlink-test-1a2b3c4d.mp4' },
      durationSeconds: 28,
    })
  })
})
