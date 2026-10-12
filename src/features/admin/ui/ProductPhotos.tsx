'use client'

import Image from 'next/image'
import { useRef, useState, useTransition } from 'react'
import {
  deleteProductImageAction,
  makeMainImageAction,
  moveImageLeftAction,
  moveImageRightAction,
  uploadProductImageAction,
  type ImageActionResult,
} from '@/features/admin/actions/product-image-actions'
import { errorText } from '@/features/admin/ui/messages'
import type { ProductEditorImage } from '@/features/admin/queries/get-product-draft'
import { prepareUpload } from '@/features/admin/ui/prepare-upload'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

type ProductPhotosProps = {
  readonly slug: string
  readonly images: readonly ProductEditorImage[]
}

const ACCEPTED = 'image/jpeg,image/png,image/webp,image/avif'

export function ProductPhotos({ slug, images }: ProductPhotosProps) {
  const router = useRouter()
  const fileInput = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function run(action: () => Promise<ImageActionResult>) {
    setError(null)
    startTransition(async () => {
      const result = await action()

      if (!result.ok) {
        setError(result.error ? errorText(result.error) : 'Что-то пошло не так.')
        return
      }

      router.refresh()
    })
  }

  function upload(file: File) {
    run(async () => {
      const formData = new FormData()
      formData.set('slug', slug)
      formData.set('file', await prepareUpload(file))

      return uploadProductImageAction(null, formData)
    })
  }

  return (
    <div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3">
        {images.map((image, index) => (
          <figure
            key={image.storageKey}
            className="relative aspect-square overflow-hidden rounded-[10px] border border-subtle bg-sunken"
          >
            <Image src={image.url} alt={image.alt} fill sizes="200px" className="object-cover" />

            {index === 0 ? (
              <figcaption className="absolute top-2 left-2 rounded-pill bg-ink px-2.5 py-1.5 text-[10px] font-semibold text-on-dark">
                Главное
              </figcaption>
            ) : null}

            <div className="absolute top-2 right-2 flex gap-1">
              <button
                type="button"
                disabled={isPending || index === 0}
                onClick={() =>
                  run(() => moveImageLeftAction({ slug, storageKey: image.storageKey }))
                }
                aria-label="Сдвинуть фото влево"
                className="flex size-7 items-center justify-center rounded-full bg-ink/75 text-[12px] text-on-dark hover:bg-ink disabled:opacity-40"
              >
                ←
              </button>
              <button
                type="button"
                disabled={isPending || index === images.length - 1}
                onClick={() =>
                  run(() => moveImageRightAction({ slug, storageKey: image.storageKey }))
                }
                aria-label="Сдвинуть фото вправо"
                className="flex size-7 items-center justify-center rounded-full bg-ink/75 text-[12px] text-on-dark hover:bg-ink disabled:opacity-40"
              >
                →
              </button>
            </div>

            <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-ink/75 px-2 py-1.5">
              {index === 0 ? (
                <span className="text-[10.5px] font-semibold text-on-dark/60">В каталоге</span>
              ) : (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    run(() => makeMainImageAction({ slug, storageKey: image.storageKey }))
                  }
                  className="text-[10.5px] font-semibold text-on-dark hover:underline disabled:opacity-50"
                >
                  Сделать главным
                </button>
              )}
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  if (
                    !window.confirm(
                      'Удалить фото? Файл удаляется и из хранилища — восстановить его нельзя.',
                    )
                  ) {
                    return
                  }
                  run(() => deleteProductImageAction({ slug, storageKey: image.storageKey }))
                }}
                className="text-[10.5px] font-semibold text-alert-edge hover:underline disabled:opacity-50"
              >
                Удалить
              </button>
            </div>
          </figure>
        ))}

        <button
          type="button"
          disabled={isPending}
          onClick={() => fileInput.current?.click()}
          className={cn(
            'flex aspect-square flex-col items-center justify-center gap-1.5 rounded-[10px] border-[1.5px] border-dashed border-strong bg-raised px-2.5 text-center hover:border-accent',
            isPending && 'opacity-60',
          )}
        >
          <span className="font-display text-[20px] font-bold text-faint">+</span>
          <span className="text-[12px] font-medium text-muted">
            {isPending ? 'Загружаем…' : 'Добавить фото'}
          </span>
        </button>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) upload(file)
        }}
      />

      {error ? <p className="mt-3 text-[12.5px] text-alert">{error}</p> : null}
    </div>
  )
}
