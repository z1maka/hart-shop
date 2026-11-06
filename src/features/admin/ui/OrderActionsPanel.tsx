'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { OrderStatus, PaymentRoute } from '@/db/enums'
import { updateOrderStatusAction } from '@/features/admin/actions/order-actions'
import type { StatusChangeOutcome } from '@/features/orders/services/order-admin-service'
import { orderStatusLabel } from '@/features/admin/ui/order-status'
import { errorText } from '@/features/admin/ui/messages'
import { Button } from '@/components/ui/Button'
import { inputClassName } from '@/components/ui/Field'
import { cn } from '@/lib/utils'

type OrderActionsPanelProps = {
  readonly orderId: string
  readonly status: OrderStatus
  readonly allowedNextStatuses: readonly OrderStatus[]
  readonly paymentRoute: PaymentRoute
}

const selectClass = cn(inputClassName, 'font-normal')

export function OrderActionsPanel({
  orderId,
  status,
  allowedNextStatuses,
  paymentRoute,
}: OrderActionsPanelProps) {
  const router = useRouter()
  const [nextStatus, setNextStatus] = useState<OrderStatus | ''>('')
  const [notice, setNotice] = useState<{ text: string; isError: boolean } | null>(null)
  const [isPending, startTransition] = useTransition()

  function changeStatus(next: OrderStatus) {
    setNotice(null)
    startTransition(async () => {
      const result = await updateOrderStatusAction({ orderId, status: next })

      if (!result.ok) {
        setNotice({ text: errorText(result.error), isError: true })
        return
      }

      setNotice(statusChangeNotice(result.data))

      router.refresh()
    })
  }

  return (
    <div className="grid gap-4">
      <section className="rounded-card border border-subtle bg-surface p-5">
        <h2 className="mb-1 text-[14px] font-semibold text-ink">Статус</h2>
        <p className="mb-3 text-[12.5px] leading-relaxed text-muted">
          Сейчас: {orderStatusLabel(status, paymentRoute)}.
          {allowedNextStatuses.length === 0 ? ' Это конечный статус.' : ''}
        </p>

        {allowedNextStatuses.length > 0 ? (
          <div className="flex flex-wrap gap-2.5">
            <select
              value={nextStatus}
              onChange={(event) => setNextStatus(event.target.value as OrderStatus)}
              className={cn(selectClass, 'min-w-52 flex-1')}
            >
              <option value="">Выберите новый статус…</option>
              {allowedNextStatuses.map((entry) => (
                <option key={entry} value={entry}>
                  {orderStatusLabel(entry, paymentRoute)}
                </option>
              ))}
            </select>
            <Button
              disabled={isPending || nextStatus === ''}
              onClick={() => nextStatus !== '' && changeStatus(nextStatus)}
            >
              {isPending ? 'Сохраняем…' : 'Сменить статус'}
            </Button>
          </div>
        ) : null}

        {paymentRoute === PaymentRoute.BankTransfer && status === OrderStatus.Pending ? (
          <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
            Заказ по счёту: когда деньги придут на счёт, переведите его в «Оплачен» — дата платежа
            запишется автоматически.
          </p>
        ) : null}
        {paymentRoute === PaymentRoute.CashOnDelivery ? (
          <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
            Наложенный платёж: деньги собирает Нова Пошта при вручении. Заказ отметится оплаченным
            автоматически при переводе в «Доставлен».
          </p>
        ) : null}
      </section>

      {notice ? (
        <p
          className={cn(
            'text-[13px] font-medium',
            notice.isError ? 'text-alert' : 'text-accent-hover',
          )}
        >
          {notice.text}
        </p>
      ) : null}
    </div>
  )
}

// What went to the buyer with the new status: the mail with the tracking
// link, the SMS with the waybill number, both, or neither.
function statusChangeNotice(outcome: StatusChangeOutcome): { text: string; isError: boolean } {
  const failed = [
    outcome.mailSent === false && 'письмо',
    outcome.smsSent === false && 'SMS',
  ].filter((channel): channel is string => typeof channel === 'string')
  if (failed.length > 0) {
    return {
      text: `Статус сохранён, но покупателю не удалось отправить: ${failed.join(' и ')} — проверьте сервис.`,
      isError: true,
    }
  }

  const sent = [
    outcome.mailSent === true && 'письмо с трек-номером',
    outcome.smsSent === true && 'SMS с ТТН',
  ].filter((channel): channel is string => typeof channel === 'string')
  return {
    text: sent.length > 0 ? `Сохранено. Покупателю ушло: ${sent.join(' и ')}.` : 'Сохранено.',
    isError: false,
  }
}
