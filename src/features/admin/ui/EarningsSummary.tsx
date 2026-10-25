import type { AdminEarningsView } from '@/features/admin/queries/get-admin-earnings'
import { EarningsDailyChart, type EarningsChartDay } from '@/features/admin/ui/EarningsDailyChart'
import { percent, wholeMoney } from '@/features/admin/ui/stats-format'
import { sharePercent, type EarningsDay, type EarningsTotals } from '@/features/orders'
import { cn } from '@/lib/utils'

// What the workshop's goods earned: the sale price less the workshop's
// price, nothing else taken off. The ads have their own panel below.

type Breakdown = Pick<AdminEarningsView, 'collected' | 'pending' | 'all'>

const FULL_METER = 100

export function EarningsSummary({ view }: { readonly view: AdminEarningsView }) {
  return (
    <section aria-labelledby="earnings-title" className="grid gap-3">
      <h2 id="earnings-title" className="font-display text-[16px] font-bold text-ink uppercase">
        Заработок
      </h2>
      <div className="grid overflow-hidden rounded-card border border-subtle bg-surface lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
        <EarningsHero breakdown={view} />
        <SummaryFacts totals={view.all} />
      </div>
      <DailyEarningsCard days={view.days} />
      <BreakdownTable breakdown={view} />
    </section>
  )
}

function EarningsHero({ breakdown }: { readonly breakdown: Breakdown }) {
  const { all, collected, pending } = breakdown

  return (
    <div className="p-5 sm:p-6">
      <p className="text-[13px] font-semibold text-muted">Чистый заработок</p>
      <p className="mt-1.5 text-[36px] leading-none font-semibold text-ink sm:text-[44px]">
        {wholeMoney(all.earningsCents)}
      </p>
      <p className="mt-2 text-[12.5px] text-faint">Цена продажи минус цена цеха</p>
      <CollectionMeter
        collectedCents={collected.earningsCents}
        pendingCents={pending.earningsCents}
      />
      <UncostedNote totals={all} />
    </div>
  )
}

// The numbers the earnings come from, beside the hero on a wide screen.
function SummaryFacts({ totals }: { readonly totals: EarningsTotals }) {
  return (
    <dl className="grid divide-y divide-subtle border-t border-subtle lg:border-t-0 lg:border-l">
      <SummaryFact
        label="Выручка"
        hint={`Заказов: ${totals.orders} · ${totals.units} шт.`}
        value={wholeMoney(totals.revenueCents)}
      />
      <SummaryFact
        label="Цена цеха"
        hint={`${percent(sharePercent(totals.costCents, costedRevenue(totals)))} от выручки`}
        value={wholeMoney(totals.costCents)}
      />
      <SummaryFact
        label="Маржа"
        hint={`В среднем ${wholeMoney(averagePerOrder(totals))} с заказа`}
        value={percent(totals.marginPercent)}
      />
    </dl>
  )
}

function SummaryFact({
  label,
  hint,
  value,
}: {
  readonly label: string
  readonly hint: string
  readonly value: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5 sm:px-6">
      <dt>
        <span className="block text-[13px] font-medium text-ink">{label}</span>
        <span className="block text-[12px] text-faint">{hint}</span>
      </dt>
      <dd className="text-[20px] font-semibold whitespace-nowrap text-ink">{value}</dd>
    </div>
  )
}

// How much of the earnings is already in hand and how much still travels.
function CollectionMeter({
  collectedCents,
  pendingCents,
}: {
  readonly collectedCents: number
  readonly pendingCents: number
}) {
  const totalCents = collectedCents + pendingCents
  // A loss has no share to draw: the meter shows only while there is a gain.
  const share = totalCents > 0 ? sharePercent(Math.max(collectedCents, 0), totalCents) : null
  const collectedShare = share === null ? null : Math.min(share, FULL_METER)

  return (
    <div className="mt-5">
      {collectedShare === null ? null : (
        <div className="flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden>
          <span className="bg-chart-collected" style={{ width: `${collectedShare}%` }} />
          <span className="flex-1 bg-chart-pending" />
        </div>
      )}
      <dl className="mt-3 grid grid-cols-2 gap-3 text-[12.5px]">
        <MeterLegend label="Забрали" value={collectedCents} swatch="bg-chart-collected" />
        <MeterLegend label="Ещё не забрали" value={pendingCents} swatch="bg-chart-pending" />
      </dl>
    </div>
  )
}

function MeterLegend({
  label,
  value,
  swatch,
}: {
  readonly label: string
  readonly value: number
  readonly swatch: string
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-muted">
        <span aria-hidden className={cn('size-2 rounded-full', swatch)} />
        {label}
      </dt>
      <dd className="mt-0.5 text-[15px] font-semibold text-ink">{wholeMoney(value)}</dd>
    </div>
  )
}

function UncostedNote({ totals }: { readonly totals: EarningsTotals }) {
  if (totals.uncostedUnits === 0) return null

  return (
    <p className="mt-4 rounded-control bg-alert-soft px-3 py-2 text-[12px] font-medium text-alert">
      {totals.uncostedUnits} шт. на {wholeMoney(totals.uncostedRevenueCents)} без цены цеха — в
      заработок не вошли. Впишите цену в карточке товара.
    </p>
  )
}

function DailyEarningsCard({ days }: { readonly days: readonly EarningsDay[] }) {
  return (
    <div className="rounded-card border border-subtle bg-surface p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h3 className="text-[14px] font-semibold text-ink">Заработок по дням, ₴</h3>
        <div className="flex gap-4 text-[12px] text-muted">
          <LegendKey label="Забрали" swatch="bg-chart-collected" />
          <LegendKey label="Ещё не забрали" swatch="bg-chart-pending" />
        </div>
      </div>
      <EarningsDailyChart days={days.map(chartDay)} />
    </div>
  )
}

function LegendKey({ label, swatch }: { readonly label: string; readonly swatch: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden className={cn('h-2.5 w-3 rounded-[2px]', swatch)} />
      {label}
    </span>
  )
}

function BreakdownTable({ breakdown }: { readonly breakdown: Breakdown }) {
  const columns = [breakdown.collected, breakdown.pending, breakdown.all]

  return (
    <div className="rounded-card border border-subtle bg-surface">
      <table className="w-full table-fixed text-[12.5px] tabular-nums sm:text-[13px]">
        <thead>
          <tr className="text-left text-[12px] text-muted">
            <th className="w-[30%] py-3 pr-2 pl-4 font-medium sm:w-2/5">Разбивка</th>
            <th className="px-2 py-3 text-right font-medium">Забрали</th>
            <th className="px-2 py-3 text-right font-medium">Не забрали</th>
            <th className="py-3 pr-4 pl-2 text-right font-semibold text-ink">Всего</th>
          </tr>
        </thead>
        <tbody>
          {BREAKDOWN_ROWS.map((row) => (
            <BreakdownRow key={row.label} row={row} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function BreakdownRow({
  row,
  columns,
}: {
  readonly row: (typeof BREAKDOWN_ROWS)[number]
  readonly columns: readonly EarningsTotals[]
}) {
  return (
    <tr className="border-t border-subtle">
      <th scope="row" className="py-2.5 pr-2 pl-4 text-left font-normal text-muted">
        {row.label}
      </th>
      {columns.map((totals, index) => (
        <td
          key={index}
          className={cn(
            'px-2 py-2.5 text-right whitespace-nowrap text-ink last:pr-4',
            row.isStrong && 'font-semibold',
          )}
        >
          {row.value(totals)}
        </td>
      ))}
    </tr>
  )
}

const BREAKDOWN_ROWS: readonly {
  label: string
  value: (totals: EarningsTotals) => string
  isStrong?: boolean
}[] = [
  { label: 'Заказов', value: (totals) => String(totals.orders) },
  { label: 'Позиций, шт.', value: (totals) => String(totals.units) },
  { label: 'Выручка', value: (totals) => wholeMoney(totals.revenueCents) },
  { label: 'Цена цеха', value: (totals) => wholeMoney(totals.costCents) },
  { label: 'Заработок', value: (totals) => wholeMoney(totals.earningsCents), isStrong: true },
  { label: 'Маржа', value: (totals) => percent(totals.marginPercent) },
]

function chartDay(day: EarningsDay): EarningsChartDay {
  return {
    day: day.day,
    collectedCents: day.collectedCents,
    pendingCents: day.allCents - day.collectedCents,
    orders: day.orders,
  }
}

function averagePerOrder(totals: EarningsTotals): number {
  return totals.orders === 0 ? 0 : Math.round(totals.earningsCents / totals.orders)
}

// The revenue of the lines that have a workshop price: the cost's share is
// read against it, as the earnings are.
function costedRevenue(totals: EarningsTotals): number {
  return totals.revenueCents - totals.uncostedRevenueCents
}
