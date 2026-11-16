'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { removeProductVideoAction } from '@/features/admin/actions/product-video-actions'
import type { ProductEditorVideo } from '@/features/admin/queries/get-product-draft'
import { errorText } from '@/features/admin/ui/messages'
import { VideoKind } from '@/features/catalog/model/product-video'

type ProductVideosProps = {
  readonly slug: string
  readonly videos: readonly ProductEditorVideo[]
}

const KIND_LABELS: Record<VideoKind, string> = {
  [VideoKind.Test]: 'Тест',
  [VideoKind.Overview]: 'Обзор',
}

export function ProductVideos({ slug, videos }: ProductVideosProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function remove(video: ProductEditorVideo) {
    const isConfirmed = window.confirm(
      `Убрать видео «${video.caption}» с этого товара? Файл не удаляется, у других товаров видео остаётся. Вернуть его сюда из админки нельзя.`,
    )
    if (!isConfirmed) return

    setError(null)
    startTransition(async () => {
      const result = await removeProductVideoAction({ slug, videoId: video.id })

      if (!result.ok) {
        setError(result.error ? errorText(result.error) : 'Что-то пошло не так.')
        return
      }

      router.refresh()
    })
  }

  if (videos.length === 0) {
    return <p className="text-[13px] text-muted">У товара нет видео.</p>
  }

  return (
    <div>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(200px,100%),1fr))] gap-3">
        {videos.map((video, index) => (
          <li
            key={video.id}
            className="flex flex-col overflow-hidden rounded-[10px] border border-subtle bg-sunken"
          >
            <a
              href={video.playerUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Смотреть видео ${index + 1} в новой вкладке`}
              className="relative block aspect-video"
            >
              <Image
                src={video.thumbnailUrl}
                alt={video.caption}
                fill
                sizes="320px"
                className="object-cover"
              />
              <span className="absolute top-2 left-2 rounded-pill bg-ink px-2.5 py-1.5 text-[10px] font-semibold text-on-dark">
                {KIND_LABELS[video.kind]}
              </span>
              <span className="absolute right-2 bottom-2 rounded-pill bg-ink/75 px-2 py-1 text-[10.5px] font-semibold text-on-dark">
                {video.duration}
              </span>
            </a>

            <div className="flex flex-1 flex-col gap-2 bg-surface px-2.5 py-2">
              <p className="text-[12.5px] leading-snug text-ink">{video.caption}</p>
              <div className="mt-auto flex justify-between gap-2">
                <a
                  href={video.playerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11.5px] font-semibold text-muted hover:underline"
                >
                  Смотреть
                </a>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => remove(video)}
                  className="text-[11.5px] font-semibold text-alert-edge hover:underline disabled:opacity-50"
                >
                  Убрать
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {error ? <p className="mt-3 text-[12.5px] text-alert">{error}</p> : null}
    </div>
  )
}
