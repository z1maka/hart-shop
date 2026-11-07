'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { errorText } from '@/features/admin/ui/messages'
import {
  deleteSettlementAction,
  markSettlementPaidAction,
} from '@/features/settlements/actions/settlement-actions'

type SettlementControlsProps = {
  readonly settlementId: string
  readonly number: number
  readonly today: string
}

// For an act still waiting for the workshop's money: record the day it came,
// or delete the act so its orders go back to the list.
export function SettlementControls({ settlementId, number, today }: SettlementControlsProps) {
  const router = useRouter()
  const [paidOn, setPaidOn] = useState(today)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function markPaid() {
    setError(null)
    startTransition(async () => {
      const result = await markSettlementPaidAction({ settlementId, paidOn })
      if (!result.ok) {
        setError(result.error.hint ?? errorText(result.error))
        return
      }
      router.refresh()
    })
  }

  function remove() {
    setError(null)
    startTransition(async () => {
      const result = await deleteSettlementAction({ settlementId })
      if (!result.ok) {
        setIsDeleting(false)
        setError(errorText(result.error))
        return
      }
      router.push('/admin/settlements/')
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <label className="flex items-center gap-2 text-[12.5px] text-on-dark/80">
        Цех оплатил
        <input
          type="date"
          value={paidOn}
          max={today}
          onChange={(event) => setPaidOn(event.target.value)}
          className="min-h-9 rounded-control border border-on-dark/40 bg-transparent px-2 text-[13px] text-on-dark"
        />
      </label>
      <Button variant="khaki" size="sm" disabled={isPending || !paidOn} onClick={markPaid}>
        Отметить оплату
      </Button>
      <Button
        variant="outlineOnDark"
        size="sm"
        disabled={isPending}
        onClick={() => setIsDeleting(true)}
      >
        Удалить акт
      </Button>
      {error ? <p className="w-full text-[12.5px] font-medium text-khaki">{error}</p> : null}
      <ConfirmDialog
        isOpen={isDeleting}
        onOpenChange={setIsDeleting}
        title={`Удалить акт № ${number}?`}
        confirmLabel="Удалить"
        cancelLabel="Оставить"
        isPending={isPending}
        onConfirm={remove}
        isDestructive
      >
        Его заказы вернутся в список для следующего акта. Номер {number} больше не повторится.
      </ConfirmDialog>
    </div>
  )
}
