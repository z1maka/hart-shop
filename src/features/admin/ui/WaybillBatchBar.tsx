'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { issueWaybillBatchAction } from '@/features/admin/actions/order-actions'
import { errorText } from '@/features/admin/ui/messages'
import { readinessHint } from '@/features/admin/ui/order-readiness'
import type { WaybillBatchOutcome } from '@/features/orders'
import { Button } from '@/components/ui/Button'

// Matches the action's limit: the carrier answers in a second or two per
// parcel, and the request has to finish.
export const BATCH_MAX = 10

type WaybillBatchBarProps = {
  readonly orderIds: readonly string[]
  readonly onOutcomes: (outcomes: readonly WaybillBatchOutcome[]) => void
  readonly onDone: () => void
}

// The daily round in one press: every ticked order gets its waybill with the
// weight and description its own form would offer.
export function WaybillBatchBar({ orderIds, onOutcomes, onDone }: WaybillBatchBarProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const isOverLimit = orderIds.length > BATCH_MAX

  function issue() {
    const question = `Создать накладные Новой Почты на ${orderIds.length} заказ(ов)? Удалять их придётся по одной — в заказе или в кабинете.`
    if (!window.confirm(question)) return

    setError(null)
    onOutcomes([])
    startTransition(async () => {
      const result = await issueWaybillBatchAction({ orderIds }).catch(() => null)
      if (!result?.ok) {
        setError(result ? errorText(result.error) : 'Нет ответа от сервера — обновите страницу.')
        return
      }
      onOutcomes(result.data)
      onDone()
      router.refresh()
    })
  }

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2.5 rounded-card border border-ink bg-ink px-4 py-3 text-on-dark">
      <span className="mr-auto text-[13px] font-semibold">
        Выбрано: {orderIds.length}
        {isOverLimit ? ` — за один раз не больше ${BATCH_MAX}` : ''}
      </span>
      {error ? <span className="text-[12.5px] text-alert-soft">{error}</span> : null}
      <Button size="sm" disabled={isPending || isOverLimit} onClick={issue}>
        {isPending ? 'Создаём…' : 'Создать ТТН'}
      </Button>
      <button
        type="button"
        onClick={onDone}
        disabled={isPending}
        className="px-2 text-[12.5px] font-semibold text-on-dark/80 hover:text-on-dark"
      >
        Сбросить
      </button>
    </div>
  )
}

type BatchOutcomesProps = {
  readonly outcomes: readonly WaybillBatchOutcome[]
  readonly onHide: () => void
}

export function BatchOutcomes({ outcomes, onHide }: BatchOutcomesProps) {
  if (outcomes.length === 0) return null

  return (
    <div className="mb-3 rounded-card border border-subtle bg-surface p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[13px] font-semibold text-ink">Что получилось</p>
        <button
          type="button"
          onClick={onHide}
          className="text-[12.5px] font-semibold text-muted hover:text-ink"
        >
          Скрыть
        </button>
      </div>
      <ul className="grid gap-1 text-[12.5px]">
        {outcomes.map((outcome) => (
          <li key={outcome.orderNumber}>
            <span className="font-semibold text-ink">{outcome.orderNumber}</span>:{' '}
            {outcome.kind === 'issued' ? (
              <span className="text-muted">ТТН {outcome.waybillNumber}</span>
            ) : (
              <span className="font-medium text-alert">{outcomeReason(outcome)}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function outcomeReason(outcome: WaybillBatchOutcome): string {
  if (outcome.kind === 'not-ready') return readinessHint(outcome.readiness)
  if (outcome.kind === 'failed') return errorText({ code: outcome.errorCode, message: '' })
  return ''
}
