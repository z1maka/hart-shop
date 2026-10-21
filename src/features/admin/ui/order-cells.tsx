import { isParcelAlert, parcelStageLabel } from '@/features/admin/ui/order-status'
import { destinationMark } from '@/features/admin/ui/order-destination'
import { TRAFFIC_SOURCE_LABELS, UNKNOWN_TRAFFIC_LABEL } from '@/features/admin/ui/traffic-labels'
import type { OrderDestination } from '@/features/orders/model/destination'
import type { OrderListRow } from '@/features/orders'
import { ParcelStage } from '@/features/shipping/model/parcel-tracking'
import { phoneCallHref } from '@/lib/phone'
import { cn } from '@/lib/utils'

// The cells an order shows in the list, shared by the desktop table and the
// phone cards so both read the same.

export const chipClass =
  'inline-block rounded-pill px-2.5 py-1.5 text-[11px] font-semibold whitespace-nowrap'

// The buyer's phone as a tap-to-call link, plain text when it cannot be
// dialled: the admin on a phone confirms the order with one tap.
export function PhoneLink({
  phone,
  className,
}: {
  readonly phone: string
  readonly className?: string
}) {
  const href = phoneCallHref(phone)
  if (!href) return <span className={className}>{phone}</span>

  return (
    <a
      href={href}
      className={cn('underline underline-offset-2 hover:text-accent-hover', className)}
    >
      {phone}
    </a>
  )
}

// The channel on one line, its campaign or tag below so a long name does
// not widen the column.
export function TrafficCell({ traffic }: { readonly traffic: OrderListRow['traffic'] }) {
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
export function DestinationCell({ destination }: { readonly destination: OrderDestination }) {
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
export function ParcelLine({
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
