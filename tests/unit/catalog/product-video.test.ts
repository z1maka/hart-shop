import { describe, expect, it } from 'vitest'
import {
  clockDuration,
  featuredVideoOf,
  isoDuration,
  VideoKind,
  type ProductVideo,
} from '@/features/catalog/model/product-video'

function video(youtubeId: string, kind: VideoKind): ProductVideo {
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
