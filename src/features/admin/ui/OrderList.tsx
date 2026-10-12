'use client'

import Link from 'next/link'
import { Fragment, useState, type ReactNode } from 'react'
import {
  dayMarkLabel,
  isParcelAlert,
  orderGroupLabel,
  orderStatusClass,
  orderStatusLabel,
  parcelStageLabel,
  PAYMENT_ROUTE_LABELS,
} from '@/features/admin/ui/order-status'
import { destinationMark } from '@/features/admin/ui/order-destination'
import { readinessHint, readinessNote } from '@/features/admin/ui/order-readiness'
import { TRAFFIC_SOURCE_LABELS, UNKNOWN_TRAFFIC_LABEL } from '@/features/admin/ui/traffic-labels'
import { BATCH_MAX, BatchOutcomes, WaybillBatchBar } from '@/features/admin/ui/WaybillBatchBar'
import { type OrderDestination } from '@/features/orders/model/destination'
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
import { ParcelStage } from '@/features/shipping/model/parcel-tracking'
import { cn } from '@/lib/utils'

const headerCell = 'p-3 text-[12px] font-semibold whitespace-nowrap text-muted'
const chipClass =
  'inline-block rounded-pill px-2.5 py-1.5 text-[11px] font-semibold whitespace-nowrap'

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

      <div className="overflow-x-auto rounded-card border border-subtle bg-surface">
        <table className="w-full min-w-[1060px] border-collapse text-[13.5px]">
          <thead>
            <tr className="bg-sunken text-left">
              {isPicking ? (
                <th className="w-10 p-3 pl-4">
                  <input
                    type="checkbox"
                    checked={selected.size > 0}
                    onChange={() =>
                      setSelected(
                        selected.size > 0
                          ? new Set()
                          : new Set(ready.slice(0, BATCH_MAX).map((row) => row.id)),
                      )
                    }
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

// The channel on one line, its campaign or tag below so a long name does
// not widen the column.
function TrafficCell({ traffic }: { readonly traffic: OrderListRow['traffic'] }) {
  if (!traffic) return <span className="text-faint">{UNKNOWN_TRAFFIC_LABEL}</span>

  return (
    <>
      <span className="whitespace-nowrap">{TRAFFIC_SOURCE_LABELS[traffic.source]}</span>
      {traffic.detail ? (
        <span className="line-clamp-2 max-w-[160px] text-[12px] text-faint" title={traffic.detail}>
          {traffic.detail}
        </span>
      ) : null}
    </>
  )
}

// The branch as the carrier names it, and — when it is not settled — why
// the daily round cannot take this row yet.
function DestinationCell({ destination }: { readonly destination: OrderDestination }) {
  const mark = destinationMark(destination.kind)
  const label = destination.label ?? mark.fallback

  return (
    <div className="grid gap-1">
      {mark.chip ? (
        <span className={cn(chipClass, 'w-fit', mark.chipClass)}>{mark.chip}</span>
      ) : null}
      {/* Two lines rather than one cut short: a branch is «№30 · street ·
          city», and the city is the half that gets lost. */}
      <span className="line-clamp-2 text-[12.5px] leading-snug text-muted" title={label}>
        {label}
      </span>
    </div>
  )
}

// Under the status: where the parcel is. In a settled group the group's own
// title already says «waiting for handover», so the line names the waybill
// instead, linked to the carrier's tracking, and adds the stage only once
// the box has moved.
function ParcelLine({
  row,
  isSettled,
}: {
  readonly row: OrderListRow
  readonly isSettled: boolean
}) {
  if (!row.trackingNumber) return null
  // A waybill issued minutes ago has no stage yet: the hourly tracking
  // fills it in. The number is known already and is shown at once.
  if (!isSettled && !row.parcelStage) return null

  const isMoving = row.parcelStage !== null && row.parcelStage !== ParcelStage.Created
  const stage =
    row.parcelStage && (isMoving || !isSettled) ? parcelStageLabel(row.parcelStage) : null
  const isAlert = row.parcelStage !== null && isParcelAlert(row.parcelStage)

  return (
    <span
      className={cn(
        'mt-1 block text-[12px] whitespace-nowrap',
        isAlert ? 'font-semibold text-alert' : 'text-faint',
      )}
    >
      {isSettled ? <WaybillLink row={row} /> : null}
      {isSettled && stage ? ' · ' : null}
      {stage}
    </span>
  )
}

function WaybillLink({ row }: { readonly row: OrderListRow }) {
  const label = `ТТН ${row.trackingNumber}`
  if (!row.trackingUrl) return <span>{label}</span>

  return (
    <a
      href={row.trackingUrl}
      target="_blank"
      rel="noreferrer"
      className="underline-offset-2 hover:text-ink hover:underline"
    >
      {label}
    </a>
  )
}
