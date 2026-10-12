'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { refreshStorefrontAction } from '@/features/admin/actions/catalog-actions'
import { errorText } from '@/features/admin/ui/messages'
import { Button } from '@/components/ui/Button'

export function RefreshStorefront() {
  const router = useRouter()
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function refresh() {
    setMessage(null)
    startTransition(async () => {
      const result = await refreshStorefrontAction()

      if (!result.ok) {
        setMessage(errorText(result.error))
        return
      }

      setMessage('Витрина обновлена')
      router.refresh()
    })
  }

  return (
    <span className="flex flex-wrap items-center gap-2.5">
      {message ? <span className="text-[12px] text-muted">{message}</span> : null}
      <Button type="button" variant="secondary" size="sm" onClick={refresh} disabled={isPending}>
        {isPending ? 'Обновляем…' : 'Обновить витрину'}
      </Button>
    </span>
  )
}
