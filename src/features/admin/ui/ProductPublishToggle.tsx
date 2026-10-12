'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { setProductStatusAction } from '@/features/admin/actions/catalog-actions'
import { ProductStatus } from '@/db/enums'
import { errorText } from '@/features/admin/ui/messages'
import { cn } from '@/lib/utils'

type ProductPublishToggleProps = {
  readonly slug: string
  readonly title: string
  readonly isPublished: boolean
  readonly isCategoryHidden: boolean
  // In the list's narrow action column the short verb is enough.
  readonly isCompact?: boolean
}

// Both directions change what buyers see within a minute, and the link sits
// in a dense table where a stray click is easy — so each asks first.
function confirmText(title: string, isPublished: boolean): string {
  return isPublished
    ? `Снять «${title}» с публикации? Товар исчезнет с сайта, из поиска и карты сайта. Вернуть его можно из архива.`
    : `Опубликовать «${title}»? Товар появится на сайте, в поиске и карте сайта в течение минуты.`
}

export function ProductPublishToggle({
  slug,
  title,
  isPublished,
  isCategoryHidden,
  isCompact = false,
}: ProductPublishToggleProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (isCategoryHidden) {
    return <span className="text-[12.5px] font-semibold text-faint">Категория скрыта</span>
  }

  function toggle() {
    if (!window.confirm(confirmText(title, isPublished))) return
    setError(null)
    startTransition(async () => {
      const result = await setProductStatusAction({
        slug,
        status: isPublished ? ProductStatus.Archived : ProductStatus.Published,
      })

      if (!result.ok) {
        setError(errorText(result.error))
        return
      }

      router.refresh()
    })
  }

  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-2">
      {error ? <span className="text-[12px] text-alert">{error}</span> : null}
      <button
        type="button"
        onClick={toggle}
        disabled={isPending}
        className={cn(
          'py-1.5 text-[12.5px] font-semibold hover:underline disabled:opacity-45',
          isPublished ? 'text-alert' : 'text-accent-hover',
        )}
      >
        {unpublishLabel(isPublished, isCompact)}
      </button>
    </span>
  )
}

function unpublishLabel(isPublished: boolean, isCompact: boolean): string {
  if (!isPublished) return 'Опубликовать'
  return isCompact ? 'Снять' : 'Снять с публикации'
}
