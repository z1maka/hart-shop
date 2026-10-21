'use client'

import Link from 'next/link'
import { Fragment, type ReactNode } from 'react'
import { ContactLine } from '@/features/admin/ui/ContactLine'
import {
  chipClass,
  DestinationCell,
  ParcelLine,
  PhoneLink,
  TrafficCell,
} from '@/features/admin/ui/order-cells'
import { readinessHint, readinessNote } from '@/features/admin/ui/order-readiness'
import {
  dayMarkLabel,
  orderGroupLabel,
  orderStatusClass,
  orderStatusLabel,
  PAYMENT_ROUTE_LABELS,
} from '@/features/admin/ui/order-status'
import { BATCH_MAX } from '@/features/admin/ui/WaybillBatchBar'
import {
  type DayCalendar,
  dayMarkOf,
  groupOrders,
  OrderGroup,
  splitByDay,
} from '@/features/orders/model/order-groups'
import { WaybillReadiness } from '@/features/orders/model/shipment'
import type { OrderListRow } from '@/features/orders'
import { cn } from '@/lib/utils'

type Selection = {
  readonly isPicking: boolean
  readonly selected: ReadonlySet<string>
  readonly onToggle: (id: string) => void
}

type OrderCardListProps = Selection & {
  readonly rows: readonly OrderListRow[]
  readonly calendar: DayCalendar | null
  readonly onToggleAllReady: () => void
  // The status filter that heads the table's «Статус» column.
  readonly statusFilter?: ReactNode
}

// The order list below the table's width: the same groups, days and waybill
// selection, one card per order, so a phone never scrolls sideways.
export function OrderCardList({
  rows,
  calendar,
  onToggleAllReady,
  statusFilter,
  ...selection
}: OrderCardListProps) {
  return (
    <div className="grid gap-3 lg:hidden">
      {selection.isPicking || statusFilter ? (
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {selection.isPicking ? (
            <label className="inline-flex min-h-11 items-center gap-2.5 text-[13px] font-semibold text-ink">
              <input
                type="checkbox"
                checked={selection.selected.size > 0}
                onChange={onToggleAllReady}
                className="size-5 accent-[var(--color-ink)]"
              />
              Выбрать готовые к ТТН, до {BATCH_MAX}
            </label>
          ) : null}
          {statusFilter}
        </div>
      ) : null}

      {calendar ? (
        <CardGroups rows={rows} calendar={calendar} selection={selection} />
      ) : (
        rows.map((order) => (
          <OrderCard key={order.id} order={order} isSettled={false} selection={selection} />
        ))
      )}
    </div>
  )
}

type CardGroupsProps = {
  readonly rows: readonly OrderListRow[]
  readonly calendar: DayCalendar
  readonly selection: Selection
}

// Only the first group is work to do; the settled ones read quieter.
function CardGroups({ rows, calendar, selection }: CardGroupsProps) {
  return groupOrders(rows).map((block) => (
    <section key={block.group} className="grid gap-2">
      <h2 className="rounded-control bg-sunken px-3.5 py-2 text-[12.5px] font-semibold text-ink">
        {orderGroupLabel(block.group)}
        <span className="ml-1.5 font-normal text-muted">{block.rows.length}</span>
      </h2>
      {splitByDay(block.rows).map((day) => (
        <Fragment key={day.dayKey}>
          <p className="px-1 pt-1 text-[11.5px] font-semibold tracking-wide text-faint uppercase">
            {dayMarkLabel(
              dayMarkOf(day.dayKey, calendar),
              day.rows[0]?.placedDayLabel ?? day.dayKey,
            )}
          </p>
          {day.rows.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              isSettled={block.group !== OrderGroup.NeedsWaybill}
              selection={selection}
            />
          ))}
        </Fragment>
      ))}
    </section>
  ))
}

type OrderCardProps = {
  readonly order: OrderListRow
  // Past the daily round: its waybill exists or the box is on its way.
  readonly isSettled: boolean
  readonly selection: Selection
}

function OrderCard({ order, isSettled, selection }: OrderCardProps) {
  const canPick = selection.isPicking && !isSettled

  return (
    <article
      className={cn(
        'grid gap-2.5 rounded-card border border-subtle bg-surface p-3.5 text-[13.5px]',
        isSettled && 'text-muted',
      )}
    >
      <div className="flex items-start gap-3">
        {canPick ? <PickBox order={order} selection={selection} /> : null}
        <div className="min-w-0 flex-1">
          <Link
            href={`/admin/orders/${order.id}`}
            className="-my-1 inline-block py-1 text-[14.5px] font-semibold text-ink underline-offset-2 hover:text-accent-hover hover:underline"
          >
            {order.orderNumber}
          </Link>
          <span className="block text-[12px] text-faint">{order.placedAt}</span>
        </div>
        <span className="font-semibold whitespace-nowrap">{order.totalLabel}</span>
      </div>
      <CardStatus order={order} isSettled={isSettled} isPicking={selection.isPicking} />
      <div>
        {order.buyerName}
        {order.phone ? (
          <PhoneLink phone={order.phone} className="block w-fit text-[12.5px] text-muted" />
        ) : null}
        <ContactLine contact={order.contact} />
      </div>
      <DestinationCell destination={order.destination} />
      <CardFacts order={order} />
    </article>
  )
}

function PickBox({ order, selection }: Pick<OrderCardProps, 'order' | 'selection'>) {
  return (
    <input
      type="checkbox"
      checked={selection.selected.has(order.id)}
      disabled={order.readiness !== WaybillReadiness.Ready}
      onChange={() => selection.onToggle(order.id)}
      title={readinessHint(order.readiness)}
      aria-label={`Выбрать заказ ${order.orderNumber}`}
      className="mt-1 size-5 shrink-0 accent-[var(--color-ink)]"
    />
  )
}

function CardStatus({
  order,
  isSettled,
  isPicking,
}: {
  readonly order: OrderListRow
  readonly isSettled: boolean
  readonly isPicking: boolean
}) {
  const note = readinessNote(order.readiness)

  return (
    <div>
      <span className={cn(chipClass, orderStatusClass(order.status, order.paymentRoute))}>
        {orderStatusLabel(order.status, order.paymentRoute)}
      </span>
      <ParcelLine row={order} isSettled={isSettled} />
      {isPicking && note ? (
        <span className={cn(chipClass, 'mt-1 block w-fit bg-alert-soft text-alert')}>{note}</span>
      ) : null}
    </div>
  )
}

function CardFacts({ order }: { readonly order: OrderListRow }) {
  return (
    <dl className="grid grid-cols-2 gap-3 text-[12.5px] text-muted">
      <div>
        <dt className="text-[11.5px] text-faint">Оплата</dt>
        <dd>{PAYMENT_ROUTE_LABELS[order.paymentRoute]}</dd>
      </div>
      <div>
        <dt className="text-[11.5px] text-faint">Источник</dt>
        <dd>
          <TrafficCell traffic={order.traffic} />
        </dd>
      </div>
    </dl>
  )
}
