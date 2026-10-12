'use client'

import { useState, useTransition } from 'react'
import { getWeekTrafficAction } from '@/features/admin/actions/order-actions'
import { errorText } from '@/features/admin/ui/messages'
import { TRAFFIC_SOURCE_LABELS, UNKNOWN_TRAFFIC_LABEL } from '@/features/admin/ui/traffic-labels'
import { useLatestRequest } from '@/features/admin/ui/use-latest-request'
import type { TrafficWeek, TrafficWeekView } from '@/features/orders'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogClose } from '@/components/ui/Dialog'
import { inputClassName } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils'

type TrafficStatsDialogProps = {
  // Newest first; the first one opens.
  readonly weeks: readonly TrafficWeek[]
}

// Which channels brought the week's orders, read only when the admin asks —
// the shop's own count, the same for whoever runs Google and Meta.
export function TrafficStatsDialog({ weeks }: TrafficStatsDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [week, setWeek] = useState(weeks[0]?.key ?? '')
  const [stats, setStats] = useState<TrafficWeekView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const beginRequest = useLatestRequest()

  function load(next: string) {
    setWeek(next)
    setError(null)
    const isLatest = beginRequest()
    startTransition(async () => {
      const result = await getWeekTrafficAction({ week: next }).catch(() => null)
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
    load(week)
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={open}>
        Источники заказов
      </Button>
      <Dialog isOpen={isOpen} onOpenChange={setIsOpen} title="Источники заказов">
        <label className="flex flex-col gap-1.5 text-[12.5px] font-semibold text-muted">
          Неделя оформления заказа
          <select
            value={week}
            onChange={(event) => load(event.target.value)}
            className={cn(inputClassName, 'font-normal')}
          >
            {weeks.map((entry) => (
              <option key={entry.key} value={entry.key}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>

        <WeekChannels stats={stats} isLoading={isPending} />
        {error ? <p className="text-[13px] font-medium text-alert">{error}</p> : null}

        <p className="text-[12px] leading-relaxed text-muted">
          Заказ засчитан каналу, с которого покупатель последний раз пришёл на сайт за 30 дней до
          заказа; прямой заход не перебивает рекламу. Отменённые заказы не считаются; отказы и
          возвраты стоят отдельно и в сумму продаж не входят, свежая неделя ещё дополняется поздними
          отказами. «Неизвестно» — покупатель отказался от отслеживания или заказ оформлен раньше,
          чем сайт начал записывать источник.
        </p>
        <DialogClose asChild>
          <Button variant="secondary">Закрыть</Button>
        </DialogClose>
      </Dialog>
    </>
  )
}

function WeekChannels({
  stats,
  isLoading,
}: {
  readonly stats: TrafficWeekView | null
  readonly isLoading: boolean
}) {
  if (isLoading || !stats) {
    return (
      <div className="flex min-h-[132px] items-center justify-center">
        {isLoading ? <Spinner label="Считаем…" /> : null}
      </div>
    )
  }

  if (stats.orders === 0) {
    return <p className="min-h-[60px] text-[13px] text-muted">За эту неделю заказов нет.</p>
  }

  return (
    <table className="w-full text-[13px]">
      <thead>
        <tr className="text-left text-[12px] text-muted">
          <th className="pb-2 font-semibold">Канал</th>
          <th className="pb-2 text-right font-semibold">Заказов</th>
          <th className="pb-2 text-right font-semibold">Отказов</th>
          <th className="pb-2 text-right font-semibold">Продано</th>
          <th className="pb-2 text-right font-semibold">Доля</th>
        </tr>
      </thead>
      <tbody>
        {stats.channels.map((channel) => (
          <tr key={channel.source ?? 'unknown'} className="border-t border-subtle">
            <td className="py-2 text-ink">
              {channel.source ? TRAFFIC_SOURCE_LABELS[channel.source] : UNKNOWN_TRAFFIC_LABEL}
            </td>
            <td className="py-2 text-right text-ink">{channel.orders}</td>
            <td className="py-2 text-right text-muted">{channel.returned || '—'}</td>
            <td className="py-2 text-right text-ink">{channel.soldLabel}</td>
            <td className="py-2 text-right text-muted">
              {channel.sharePercent === null ? '—' : `${channel.sharePercent}%`}
            </td>
          </tr>
        ))}
        <tr className="border-t border-subtle font-semibold">
          <td className="py-2 text-ink">Всего</td>
          <td className="py-2 text-right text-ink">{stats.orders}</td>
          <td className="py-2 text-right text-muted">{stats.returned || '—'}</td>
          <td className="py-2 text-right text-ink">{stats.soldLabel}</td>
          <td className="py-2 text-right text-muted">100%</td>
        </tr>
      </tbody>
    </table>
  )
}
