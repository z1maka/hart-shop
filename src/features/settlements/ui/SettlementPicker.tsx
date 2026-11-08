'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { errorText } from '@/features/admin/ui/messages'
import { createSettlementAction } from '@/features/settlements/actions/settlement-actions'
import { workshopShareOf } from '@/features/settlements/model/settlement'
import type { SettlementCandidateView } from '@/features/settlements/queries/get-settlement-candidates'
import { createMoney, Currency, formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'

type SettlementPickerProps = {
  readonly periodFrom: string
  readonly periodTo: string
  readonly isFeeSet: boolean
  readonly sales: readonly SettlementCandidateView[]
  readonly returns: readonly SettlementCandidateView[]
}

// Every parcel that can go is ticked; the admin takes off what waits. The
// sum here is a preview: the server counts the act again from the orders.
export function SettlementPicker({
  periodFrom,
  periodTo,
  isFeeSet,
  sales,
  returns,
}: SettlementPickerProps) {
  const router = useRouter()
  const [picked, setPicked] = useState<ReadonlySet<string>>(
    () => new Set([...sales, ...returns].filter((row) => !row.isBlocked).map(keyOf)),
  )
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const pickedSales = sales.filter((row) => picked.has(keyOf(row)))
  const pickedReturns = returns.filter((row) => picked.has(keyOf(row)))
  const totalCents = [...pickedSales, ...pickedReturns].reduce(
    (sum, row) => sum + row.amountCents,
    0,
  )
  const count = pickedSales.length + pickedReturns.length
  const workshop = workshopShareOf([...pickedSales, ...pickedReturns])

  function toggle(row: SettlementCandidateView) {
    setPicked((current) => {
      const next = new Set(current)
      if (next.has(keyOf(row))) next.delete(keyOf(row))
      else next.add(keyOf(row))
      return next
    })
  }

  function create() {
    setError(null)
    startTransition(async () => {
      const result = await createSettlementAction({
        periodFrom,
        periodTo,
        saleOrderIds: pickedSales.map((row) => row.orderId),
        returnOrderIds: pickedReturns.map((row) => row.orderId),
      })
      if (!result.ok) {
        setError(result.error.hint ?? errorText(result.error))
        return
      }
      router.push(`/admin/settlements/${result.data}/`)
    })
  }

  return (
    <div className="grid gap-5">
      <CandidateTable
        title="Забранные посылки"
        empty="За эти дни нет забранных посылок, которые ещё не входили в акт."
        rows={sales}
        picked={picked}
        onToggle={toggle}
      />
      {returns.length > 0 ? (
        <CandidateTable
          title="Возвраты после расчёта — вычитаются"
          empty=""
          rows={returns}
          picked={picked}
          onToggle={toggle}
        />
      ) : null}

      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 rounded-card border border-subtle bg-surface p-4 shadow-float">
        <p className="text-[14px] text-ink">
          Цех должен:{' '}
          <span className="font-display text-[20px] font-bold">{money(totalCents)}</span>
          <span className="ml-2 text-[12.5px] text-muted">· заказов: {count}</span>
          <span className="mt-1 block text-[12.5px] text-muted">
            Остаётся у цеха {money(workshop.keptCents)} · себестоимость{' '}
            {money(workshop.productionCostCents)} · заработок цеха{' '}
            <span className="font-semibold text-ink">{money(workshop.earningsCents)}</span>
            {workshop.uncountedLines > 0 ? ` · без себестоимости: ${workshop.uncountedLines}` : ''}
          </span>
        </p>
        <Button onClick={create} disabled={isPending || count === 0 || !isFeeSet}>
          Создать акт
        </Button>
        {error ? <p className="w-full text-[12.5px] font-medium text-alert">{error}</p> : null}
      </div>
    </div>
  )
}

type CandidateTableProps = {
  readonly title: string
  readonly empty: string
  readonly rows: readonly SettlementCandidateView[]
  readonly picked: ReadonlySet<string>
  readonly onToggle: (row: SettlementCandidateView) => void
}

function CandidateTable({ title, empty, rows, picked, onToggle }: CandidateTableProps) {
  return (
    <section className="grid gap-2.5">
      <h2 className="text-[14px] font-semibold text-ink">
        {title} · {rows.length}
      </h2>
      {rows.length === 0 ? (
        <p className="text-[13px] text-muted">{empty}</p>
      ) : (
        <div className="overflow-x-auto rounded-card border border-subtle bg-surface">
          <table className="w-full min-w-[1080px] text-left text-[12.5px]">
            <thead className="border-b border-subtle text-[11.5px] text-muted">
              <tr>
                <th className="w-10 px-3 py-2.5" aria-label="В акт" />
                <th className="px-3 py-2.5 font-semibold">Заказ</th>
                <th className="px-3 py-2.5 font-semibold">Наименование</th>
                <th className="px-3 py-2.5 font-semibold">ТТН</th>
                <th className="px-3 py-2.5 text-right font-semibold">Продажа</th>
                <th className="px-3 py-2.5 text-right font-semibold">Цена цеха</th>
                <th className="px-3 py-2.5 text-right font-semibold">Комиссия НП</th>
                <th className="px-3 py-2.5 text-right font-semibold">Цех должен</th>
                <th className="px-3 py-2.5 text-right font-semibold">Себестоимость</th>
                <th className="px-3 py-2.5 text-right font-semibold">Заработок цеха</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={keyOf(row)}
                  className={cn(
                    'border-b border-subtle last:border-b-0',
                    row.isBlocked && 'bg-alert-soft',
                  )}
                >
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      aria-label={`${row.orderNumber} в акт`}
                      className="size-4.5 accent-ink"
                      checked={picked.has(keyOf(row))}
                      disabled={row.isBlocked}
                      onChange={() => onToggle(row)}
                    />
                  </td>
                  <td className="px-3 py-2.5 font-semibold whitespace-nowrap text-ink">
                    {row.orderNumber}
                    <span className="block text-[11px] font-normal text-faint">
                      {row.dateLabel}
                      {row.isPartner ? ' · партнёр' : ''}
                    </span>
                  </td>
                  <td className="max-w-[340px] px-3 py-2.5 text-ink">{row.itemsLabel}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-muted">
                    {row.trackingNumber ?? '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">{row.saleLabel}</td>
                  <td
                    className={cn(
                      'px-3 py-2.5 text-right whitespace-nowrap',
                      row.isBlocked && 'font-semibold text-alert',
                    )}
                  >
                    {row.costLabel}
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">{row.feeLabel}</td>
                  <td className="px-3 py-2.5 text-right font-semibold whitespace-nowrap">
                    {row.amountLabel}
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap text-muted">
                    {row.productionCostLabel}
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    {row.workshopEarningsLabel}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

// An order settled earlier and returned since comes back as its return.
function keyOf(row: SettlementCandidateView): string {
  return `${row.orderId}:${row.kind}`
}

function money(cents: number): string {
  return formatMoney(createMoney(cents, Currency.Uah))
}
