'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { setCategoryVisibilityAction } from '@/features/admin/actions/catalog-actions'
import { errorText } from '@/features/admin/ui/messages'
import { Button } from '@/components/ui/Button'

type CategoryToggleProps = {
  readonly slug: string
  readonly isVisible: boolean
}

export function CategoryToggle({ slug, isVisible }: CategoryToggleProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function toggle() {
    if (
      isVisible &&
      !window.confirm(
        'Скрыть категорию? Все её товары уйдут с витрины, из поиска и фильтров, пока категорию не опубликуют снова.',
      )
    ) {
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await setCategoryVisibilityAction({ slug, isVisible: !isVisible })

      if (!result.ok) {
        setError(errorText(result.error))
        return
      }

      router.refresh()
    })
  }

  const toggleLabel = isVisible ? 'Скрыть' : 'Опубликовать'

  return (
    <span className="flex flex-wrap items-center gap-2.5">
      {error ? <span className="text-[12px] text-alert">{error}</span> : null}
      <Button
        type="button"
        variant={isVisible ? 'secondary' : 'primary'}
        onClick={toggle}
        disabled={isPending}
      >
        {isPending ? 'Сохраняем…' : toggleLabel}
      </Button>
    </span>
  )
}
