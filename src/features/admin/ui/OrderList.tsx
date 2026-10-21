'use client'

import Link from 'next/link'
import { Fragment, useState, type ReactNode } from 'react'
import {
  dayMarkLabel,
  orderGroupLabel,
  orderStatusClass,
  orderStatusLabel,
  PAYMENT_ROUTE_LABELS,
} from '@/features/admin/ui/order-status'
import { ContactLine } from '@/features/admin/ui/ContactLine'
import { OrderCardList } from '@/features/admin/ui/OrderCardList'
import {
  chipClass,
  DestinationCell,
  ParcelLine,
  TrafficCell,
} from '@/features/admin/ui/order-cells'
import { readinessHint, readinessNote } from '@/features/admin/ui/order-readiness'
import { BATCH_MAX, BatchOutcomes, WaybillBatchBar } from '@/features/admin/ui/WaybillBatchBar'
import {
  type DayCalendar,
  dayMarkOf,
  groupOrders,
  OrderGroup,
  type OrderGroupBlock,
  splitByDay,
} from '@/features/orders/model/order-groups'
import { WaybillReadiness } from '@/features/orders/model/shipment'
import type { OrderListRow, WaybillBatchOutcome } from '@/features/orders'
import { cn } from '@/lib/utils'

const headerCell = 'p-3 text-[12px] font-semibold whitespace-nowrap text-muted'

type OrderListProps = {
  readonly rows: readonly OrderListRow[]
  // Only the working shelf issues waybills; the archive and returns do not.
  readonly canIssueWaybills: boolean
  // The working shelf is read in stages and days; the other shelves are a
  // plain list. The calendar comes from the server so the dividers and the
  // rows agree on where midnight was.
  readonly calendar: DayCalendar | null
  // What sits in the «Статус» header: the status filter, or the plain title.
  readonly statusHeader?: ReactNode
}

const COLUMN_COUNT = 8

export function OrderList({ rows, canIssueWaybills, calendar, statusHeader }: OrderListProps) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  // Kept out of the bar: the bar goes as soon as the selection clears, and
  // the admin still needs to read what happened to each order.
  const [outcomes, setOutcomes] = useState<readonly WaybillBatchOutcome[]>([])
  const ready = rows.filter((row) => row.readiness === WaybillReadiness.Ready)
  const isPicking = canIssueWaybills && ready.length > 0
  const columnCount = isPicking ? COLUMN_COUNT + 1 : COLUMN_COUNT

  function toggle(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  function toggleAllReady() {
    setSelected(
      selected.size > 0 ? new Set() : new Set(ready.slice(0, BATCH_MAX).map((row) => row.id)),
    )
  }

  return (
    <div>
      {selected.size > 0 ? (
        <WaybillBatchBar
          orderIds={[...selected]}
          onOutcomes={setOutcomes}
          onDone={() => setSelected(new Set())}
        />
      ) : null}

      <BatchOutcomes outcomes={outcomes} onHide={() => setOutcomes([])} />

      {/* The table needs about 1060px; narrower screens get one card per order. */}
      <OrderCardList
        rows={rows}
        calendar={calendar}
        isPicking={isPicking}
        selected={selected}
        onToggle={toggle}
        onToggleAllReady={toggleAllReady}
        statusFilter={statusHeader}
      />

      <div className="hidden overflow-x-auto rounded-card border border-subtle bg-surface lg:block">
        <table className="w-full min-w-[1060px] border-collapse text-[13.5px]">
          <thead>
            <tr className="bg-sunken text-left">
              {isPicking ? (
                <th className="w-10 p-3 pl-4">
                  <input
                    type="checkbox"
                    checked={selected.size > 0}
                    onChange={toggleAllReady}
                    aria-label={`Выбрать готовые к ТТН, до ${BATCH_MAX}`}
                    className="size-4 accent-[var(--color-ink)]"
                  />
                </th>
              ) : null}
              <th className={cn(headerCell, 'pl-4')}>Заказ</th>
              <th className={headerCell}>Оформлен</th>
              <th className={cn(headerCell, 'w-full')}>Покупатель</th>
              <th className={cn(headerCell, 'w-[270px] min-w-[270px]')}>Отделение</th>
              <th className={headerCell}>Оплата</th>
              <th className={headerCell}>Источник</th>
              <th className={cn(headerCell, 'text-right')}>Сумма</th>
              <th className={cn(headerCell, 'pr-4')}>{statusHeader ?? 'Статус'}</th>
            </tr>
          </thead>
          {calendar ? (
            groupOrders(rows).map((block) => (
              <tbody key={block.group}>
                <tr className="border-t border-subtle bg-sunken">
                  <td
                    colSpan={columnCount}
                    className="px-4 py-2 text-[12.5px] font-semibold text-ink"
                  >
                    {orderGroupLabel(block.group)}
                    <span className="ml-1.5 font-normal text-muted">{block.rows.length}</span>
                  </td>
                </tr>
                <GroupRows
                  block={block}
                  calendar={calendar}
                  columnCount={columnCount}
                  isPicking={isPicking}
                  selected={selected}
                  onToggle={toggle}
                />
              </tbody>
            ))
          ) : (
            <tbody>
              {rows.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  isPicking={isPicking}
                  isSettled={false}
                  isSelected={selected.has(order.id)}
                  onToggle={() => toggle(order.id)}
                />
              ))}
            </tbody>
          )}
        </table>
      </div>
    </div>
  )
}

type GroupRowsProps = {
  readonly block: OrderGroupBlock<OrderListRow>
  readonly calendar: DayCalendar
  readonly columnCount: number
  readonly isPicking: boolean
  readonly selected: ReadonlySet<string>
  readonly onToggle: (id: string) => void
}

// One group's rows with a divider at every new day. Only the first group is
// work to do; the settled ones read quieter so the eye lands on it.
function GroupRows({
  block,
  calendar,
  columnCount,
  isPicking,
  selected,
  onToggle,
}: GroupRowsProps) {
  const isSettled = block.group !== OrderGroup.NeedsWaybill

  return splitByDay(block.rows).map((day) => (
    <Fragment key={day.dayKey}>
      <tr className="border-t border-subtle">
        <td
          colSpan={columnCount}
          className="px-4 pt-2.5 pb-1 text-[11.5px] font-semibold tracking-wide text-faint uppercase"
        >
          {dayMarkLabel(dayMarkOf(day.dayKey, calendar), day.rows[0]?.placedDayLabel ?? day.dayKey)}
        </td>
      </tr>
      {day.rows.map((order) => (
        <OrderRow
          key={order.id}
          order={order}
          isPicking={isPicking}
          isSettled={isSettled}
          isSelected={selected.has(order.id)}
          onToggle={() => onToggle(order.id)}
        />
      ))}
    </Fragment>
  ))
}

type OrderRowProps = {
  readonly order: OrderListRow
  readonly isPicking: boolean
  // A row past the daily round: its waybill exists or the box is on its way.
  readonly isSettled: boolean
  readonly isSelected: boolean
  readonly onToggle: () => void
}

function OrderRow({ order, isPicking, isSettled, isSelected, onToggle }: OrderRowProps) {
  const note = readinessNote(order.readiness)

  return (
    <tr className={cn('border-t border-subtle', isSettled && 'text-muted')}>
      {isPicking ? (
        <td className="p-3 pl-4">
          {isSettled ? null : (
            <input
              type="checkbox"
              checked={isSelected}
              disabled={order.readiness !== WaybillReadiness.Ready}
              onChange={onToggle}
              title={readinessHint(order.readiness)}
              aria-label={`Выбрать заказ ${order.orderNumber}`}
              className="size-4 accent-[var(--color-ink)]"
            />
          )}
        </td>
      ) : null}
      <td className="p-3 pl-4 font-semibold whitespace-nowrap">
        <Link
          href={`/admin/orders/${order.id}`}
          className="text-ink underline-offset-2 hover:text-accent-hover hover:underline"
        >
          {order.orderNumber}
        </Link>
      </td>
      <td className="p-3 whitespace-nowrap text-muted">{order.placedAt}</td>
      <td className="p-3">
        {order.buyerName}
        <span className="block text-[12px] whitespace-nowrap text-faint">{order.phone ?? '—'}</span>
        <ContactLine contact={order.contact} />
      </td>
      <td className="w-[270px] max-w-[270px] min-w-[270px] p-3">
        <DestinationCell destination={order.destination} />
      </td>
      <td className="p-3 whitespace-nowrap text-muted">
        {PAYMENT_ROUTE_LABELS[order.paymentRoute]}
      </td>
      <td className="p-3 text-muted">
        <TrafficCell traffic={order.traffic} />
      </td>
      <td className="p-3 text-right font-semibold whitespace-nowrap">{order.totalLabel}</td>
      <td className="p-3 pr-4">
        <span className={cn(chipClass, orderStatusClass(order.status, order.paymentRoute))}>
          {orderStatusLabel(order.status, order.paymentRoute)}
        </span>
        <ParcelLine row={order} isSettled={isSettled} />
        {isPicking && note ? (
          <span className={cn(chipClass, 'mt-1 block w-fit bg-alert-soft text-alert')}>{note}</span>
        ) : null}
      </td>
    </tr>
  )
}
