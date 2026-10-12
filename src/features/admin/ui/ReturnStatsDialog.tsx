'use client'

import { useState, useTransition } from 'react'
import { getMonthReturnsAction } from '@/features/admin/actions/order-actions'
import { errorText } from '@/features/admin/ui/messages'
import { useLatestRequest } from '@/features/admin/ui/use-latest-request'
import type { MonthReturnsView, ReturnStatsMonth } from '@/features/orders'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogClose } from '@/components/ui/Dialog'
import { inputClassName } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils'

type ReturnStatsDialogProps = {
  // Newest first; the first one opens.
  readonly months: readonly ReturnStatsMonth[]
}

// Returns of one month, read only when the admin asks: the returns tab stays
// a plain list to work through.
export function ReturnStatsDialog({ months }: ReturnStatsDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [month, setMonth] = useState(months[0]?.key ?? '')
  const [stats, setStats] = useState<MonthReturnsView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const beginRequest = useLatestRequest()

  function load(next: string) {
    setMonth(next)
    setError(null)
    const isLatest = beginRequest()
    startTransition(async () => {
      const result = await getMonthReturnsAction({ month: next }).catch(() => null)
      if (!isLatest()) return
      if (!result?.ok) {
        setStats(null)
        setError(result ? errorText(result.error) : 'Нет ответа от сервера — попробуйте ещё раз.')
        return
      }
      setStats(result.data)
    })
  }

  function open() {
    setIsOpen(true)
    load(month)
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={open}>
        Показать статистику
      </Button>
      <Dialog isOpen={isOpen} onOpenChange={setIsOpen} title="Статистика возвратов">
        <label className="flex flex-col gap-1.5 text-[12.5px] font-semibold text-muted">
          Месяц оформления заказа
          <select
            value={month}
            onChange={(event) => load(event.target.value)}
            className={cn(inputClassName, 'font-normal')}
          >
            {months.map((entry) => (
              <option key={entry.key} value={entry.key}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>

        <MonthFigures stats={stats} isLoading={isPending} />
        {error ? <p className="text-[13px] font-medium text-alert">{error}</p> : null}

        <p className="text-[12px] leading-relaxed text-muted">
          Заказы считаются по месяцу оформления: отправлено — ушли с ТТН, вернулось — из них
          получили статус «Возврат». Свежий месяц ещё дополняется поздними отказами. Сколько Нова
          Пошта взяла за доставку туда и обратно, видно в её кабинете.
        </p>
        <DialogClose asChild>
          <Button variant="secondary">Закрыть</Button>
        </DialogClose>
      </Dialog>
    </>
  )
}

function MonthFigures({
  stats,
  isLoading,
}: {
  readonly stats: MonthReturnsView | null
  readonly isLoading: boolean
}) {
  if (isLoading || !stats) {
    return (
      <div className="flex min-h-[132px] items-center justify-center">
        {isLoading ? <Spinner label="Считаем…" /> : null}
      </div>
    )
  }

  const figures = [
    { label: 'Отправлено', value: String(stats.sent) },
    { label: 'Вернулось', value: String(stats.returned) },
    {
      label: 'Доля возвратов',
      value: stats.sharePercent === null ? '—' : `${stats.sharePercent}%`,
    },
    { label: 'Сумма возвратов', value: stats.returnedLabel },
  ]

  return (
    <dl className="grid min-h-[132px] grid-cols-2 gap-3">
      {figures.map((figure) => (
        <div
          key={figure.label}
          className="rounded-control border border-subtle bg-raised px-3.5 py-3"
        >
          <dt className="text-[12px] text-muted">{figure.label}</dt>
          <dd className="font-display text-[20px] font-bold text-ink">{figure.value}</dd>
        </div>
      ))}
    </dl>
  )
}
