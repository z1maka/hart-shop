'use client'

import Image from 'next/image'
import { useState } from 'react'
import type { ProductEditorImage } from '@/features/admin/queries/get-product-draft'
import { cn } from '@/lib/utils'

type VariantCoverPickerProps = {
  readonly variantLabel: string
  readonly images: readonly ProductEditorImage[]
  readonly initialStorageKey: string | null
  readonly onChange: () => void
}

// Which gallery shot stands for this colour: the feed's main image for the
// offer and where the product page jumps when the colour is picked. Nothing
// chosen means the product's first photo. The hidden field is always there,
// one per variant, so the save action can pair it with the variant id.
export function VariantCoverPicker({
  variantLabel,
  images,
  initialStorageKey,
  onChange,
}: VariantCoverPickerProps) {
  const [storageKey, setStorageKey] = useState(initialStorageKey ?? '')
  // A photo deleted in the gallery card takes its choice with it.
  const chosenKey = images.some((image) => image.storageKey === storageKey) ? storageKey : ''

  function pick(key: string) {
    setStorageKey(key === chosenKey ? '' : key)
    onChange()
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <input type="hidden" name="variantCover" value={chosenKey} />
      {images.map((image, index) => (
        <button
          key={image.storageKey}
          type="button"
          onClick={() => pick(image.storageKey)}
          aria-pressed={image.storageKey === chosenKey}
          aria-label={`Фото ${index + 1} для варианта ${variantLabel}`}
          className={cn(
            'relative size-11 shrink-0 overflow-hidden rounded-chip border-2 bg-sunken transition-opacity',
            image.storageKey === chosenKey
              ? 'border-accent'
              : 'border-transparent opacity-60 hover:opacity-100',
          )}
        >
          <Image src={image.url} alt="" fill sizes="44px" className="object-cover" />
        </button>
      ))}
      <span className="text-[11.5px] text-faint">
        {chosenKey === '' ? 'Главное фото товара' : 'Своё фото'}
      </span>
    </div>
  )
}
