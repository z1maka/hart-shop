'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { EnquiryStatus } from '@/db/enums'
import { updateEnquiryStatusAction } from '@/features/admin/actions/enquiry-actions'
import { errorText } from '@/features/admin/ui/messages'
import { cn } from '@/lib/utils'

type EnquiryStatusControlsProps = {
  readonly enquiryId: string
  readonly status: EnquiryStatus
}

// Every state offers the other two: triage moves forward, but a closed enquiry
// reopened by a reply must be able to come back without touching the database.
const NEXT_ACTIONS: Record<EnquiryStatus, readonly { status: EnquiryStatus; label: string }[]> = {
  [EnquiryStatus.New]: [
    { status: EnquiryStatus.InProgress, label: 'В работу' },
    { status: EnquiryStatus.Closed, label: 'Закрыть' },
  ],
  [EnquiryStatus.InProgress]: [
    { status: EnquiryStatus.Closed, label: 'Закрыть' },
    { status: EnquiryStatus.New, label: 'Вернуть в новые' },
  ],
  [EnquiryStatus.Closed]: [{ status: EnquiryStatus.InProgress, label: 'Открыть снова' }],
}

export function EnquiryStatusControls({ enquiryId, status }: EnquiryStatusControlsProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function change(next: EnquiryStatus) {
    setError(null)
    startTransition(async () => {
      const result = await updateEnquiryStatusAction({ enquiryId, status: next })

      if (!result.ok) {
        setError(errorText(result.error))
        return
      }

      router.refresh()
    })
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      {NEXT_ACTIONS[status].map((action) => (
        <button
          key={action.status}
          type="button"
          disabled={isPending}
          onClick={() => change(action.status)}
          className={cn(
            'min-h-9 rounded-control border border-strong bg-surface px-3 text-[12px] font-semibold text-ink',
            'hover:border-faint disabled:opacity-60',
          )}
        >
          {isPending ? 'Сохраняем…' : action.label}
        </button>
      ))}
      {error ? <span className="text-[12px] font-medium text-alert">{error}</span> : null}
    </span>
  )
}
