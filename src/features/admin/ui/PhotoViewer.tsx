'use client'

import Image from 'next/image'
import type { KeyboardEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogClose } from '@/components/ui/Dialog'
import type { ProductEditorImage } from '@/features/admin/queries/get-product-draft'

type PhotoViewerProps = {
  readonly images: readonly ProductEditorImage[]
  // The photo on screen; null keeps the viewer closed.
  readonly index: number | null
  readonly onIndexChange: (index: number | null) => void
}

export function PhotoViewer({ images, index, onIndexChange }: PhotoViewerProps) {
  const image = index === null ? undefined : images[index]
  const total = images.length

  function step(offset: -1 | 1) {
    if (index === null || total === 0) return
    onIndexChange((index + offset + total) % total)
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowLeft') step(-1)
    if (event.key === 'ArrowRight') step(1)
  }

  return (
    <Dialog
      isOpen={image !== undefined}
      onOpenChange={(isOpen) => {
        if (!isOpen) onIndexChange(null)
      }}
      title={index === null ? 'Фото' : `Фото ${index + 1} из ${total}`}
      placement="fullscreen"
    >
      {image ? (
        <div className="flex min-h-0 flex-1 flex-col gap-4" onKeyDown={onKeyDown}>
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-[10px] bg-sunken">
            <Image
              src={image.fullUrl}
              alt={image.alt}
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>

          <p className="truncate text-[12.5px] text-muted">{image.alt}</p>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              <Button variant="secondary" disabled={total < 2} onClick={() => step(-1)}>
                ← Назад
              </Button>
              <Button variant="secondary" disabled={total < 2} onClick={() => step(1)}>
                Вперёд →
              </Button>
            </div>
            <div className="flex items-center gap-4">
              <a
                href={image.fullUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[12.5px] font-semibold text-accent hover:underline"
              >
                Открыть файл
              </a>
              <DialogClose asChild>
                <Button variant="secondary">Закрыть</Button>
              </DialogClose>
            </div>
          </div>
        </div>
      ) : null}
    </Dialog>
  )
}
