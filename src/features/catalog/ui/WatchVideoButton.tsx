'use client'

import { useTranslations } from 'next-intl'
import { VideoKind, type ProductVideo } from '@/features/catalog/model/product-video'
import { useOpenGalleryVideo } from '@/features/catalog/ui/GalleryVideoControl'
import { PlayIcon } from '@/features/catalog/ui/PlayIcon'

// A quiet shortcut beside the description heading: the video starts in the
// gallery, where the photos are, instead of a player of its own.
export function WatchVideoButton({ video }: { readonly video: ProductVideo }) {
  const t = useTranslations('gallery')
  const openVideo = useOpenGalleryVideo()

  return (
    <button
      type="button"
      onClick={() => openVideo(video.youtubeId)}
      className="inline-flex items-center gap-2 rounded-pill border border-subtle bg-surface py-1 pr-3.5 pl-1 text-[12.5px] font-semibold text-ink transition-colors hover:border-accent hover:text-accent-hover"
    >
      <span className="flex size-6 items-center justify-center rounded-full bg-accent text-accent-fg">
        <PlayIcon size={12} />
      </span>
      {t(video.kind === VideoKind.Test ? 'watchTests' : 'watchVideo')}
    </button>
  )
}
