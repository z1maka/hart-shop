'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { archiveReturnAction } from '@/features/admin/actions/order-actions'
import { errorText } from '@/features/admin/ui/messages'

type ArchiveReturnButtonProps = {
  readonly orderId: string
  readonly orderNumber: string
}

// Closes a return once the parcel is back on the shelf; asks first, since
// the order then leaves the returns tab for good.
export function ArchiveReturnButton({ orderId, orderNumber }: ArchiveReturnButtonProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function archive() {
    const question = `Закрыть возврат ${orderNumber} и отправить его в архив?`
    if (!window.confirm(question)) return

    setError(null)
    startTransition(async () => {
      const result = await archiveReturnAction({ orderId }).catch(() => null)
      if (!result?.ok) {
        setError(result ? errorText(result.error) : 'Нет ответа от сервера — обновите страницу.')
        return
      }
      router.refresh()
    })
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={archive}
        disabled={isPending}
        className="text-[12.5px] font-semibold whitespace-nowrap text-accent-hover hover:underline disabled:opacity-50"
      >
        {isPending ? 'Переносим…' : 'В архив'}
      </button>
      {error ? <span className="max-w-[24ch] text-[12px] text-alert">{error}</span> : null}
    </span>
  )
}
