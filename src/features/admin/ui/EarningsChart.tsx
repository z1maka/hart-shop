import type { AdminEarningsDay } from '@/features/admin/queries/get-admin-earnings'
import { createMoney, Currency, formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'

// Earnings per day as two lines: every sale, shaded, and the collected ones
// on top — the gap between them is what is still on its way; a dashed line
// is the day's Google Ads spend once Analytics is connected. Plain SVG: one
// chart does not justify a charting library (AGENTS.md §4). The plot
// stretches to its box while the labels stay HTML, so they read the same on
// a phone and on a wide screen.

const PLOT_HEIGHT = 100
const PERCENT = 100
const AD_SPEND_DASH = '5 4'

type Point = { readonly x: number; readonly y: number }

type ChartScale = {
  readonly count: number
  readonly step: number
  readonly top: number
  readonly bottom: number
}

export function EarningsChart({ days }: { readonly days: readonly AdminEarningsDay[] }) {
  if (days.length === 0) return null

  const scale = chartScale(days)
  const hasAdSpend = days.some((day) => day.adSpendCents !== null)

  return (
    <figure>
      <div className="grid grid-cols-[auto_1fr] gap-x-2">
        <ValueLabels scale={scale} />
        <div className="relative h-48 sm:h-56">
          <Plot days={days} scale={scale} hasAdSpend={hasAdSpend} />
        </div>
        <div />
        <DayLabels days={days} scale={scale} />
      </div>
      <Legend hasAdSpend={hasAdSpend} />
    </figure>
  )
}

function ValueLabels({ scale }: { readonly scale: ChartScale }) {
  const zeroY = yOf(scale, 0)

  return (
    <div className="relative w-[84px] text-right text-[11.5px] text-muted">
      {scale.top > 0 ? (
        <span className="absolute top-0 right-0 -translate-y-1/2">{money(scale.top)}</span>
      ) : null}
      <span className="absolute right-0 -translate-y-1/2" style={{ top: `${zeroY}%` }}>
        {money(0)}
      </span>
      {scale.bottom < 0 ? (
        <span className="absolute right-0 bottom-0 translate-y-1/2">{money(scale.bottom)}</span>
      ) : null}
    </div>
  )
}

function Plot({
  days,
  scale,
  hasAdSpend,
}: {
  readonly days: readonly AdminEarningsDay[]
  readonly scale: ChartScale
  readonly hasAdSpend: boolean
}) {
  const zeroY = yOf(scale, 0)
  const allPoints = pointsOf(days, scale, (day) => day.allCents)

  return (
    <svg
      viewBox={`0 0 1 ${PLOT_HEIGHT}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="Заработок по дням: все заказы и забранные"
      className="absolute inset-0 h-full w-full overflow-visible"
    >
      <line
        x1={0}
        x2={1}
        y1={zeroY}
        y2={zeroY}
        className="stroke-strong"
        vectorEffect="non-scaling-stroke"
      />
      <path d={areaPath(allPoints, zeroY)} className="fill-accent-soft" />
      <Line points={allPoints} className="stroke-accent" width={2} />
      <Line
        points={pointsOf(days, scale, (day) => day.collectedCents)}
        className="stroke-khaki-mark"
        width={2.5}
      />
      {hasAdSpend ? (
        <Line
          points={pointsOf(days, scale, (day) => day.adSpendCents ?? 0)}
          className="stroke-alert"
          width={1.5}
          dash={AD_SPEND_DASH}
        />
      ) : null}
      {days.map((day, index) => (
        <DayBand key={day.day} day={day} index={index} scale={scale} />
      ))}
    </svg>
  )
}

function Line({
  points,
  className,
  width,
  dash,
}: {
  readonly points: readonly Point[]
  readonly className: string
  readonly width: number
  readonly dash?: string
}) {
  return (
    <path
      d={linePath(points)}
      className={cn('fill-none', className)}
      strokeWidth={width}
      strokeDasharray={dash}
      vectorEffect="non-scaling-stroke"
    />
  )
}

// A day's hover band, kept inside the plot: the svg lets the lines' strokes
// overflow its box, and the edge bands would follow them out.
function DayBand({
  day,
  index,
  scale,
}: {
  readonly day: AdminEarningsDay
  readonly index: number
  readonly scale: ChartScale
}) {
  const start = Math.max(0, xOf(scale, index) - scale.step / 2)
  const end = Math.min(1, xOf(scale, index) + scale.step / 2)

  return (
    <rect
      x={start}
      width={end - start}
      y={0}
      height={PLOT_HEIGHT}
      className="fill-transparent hover:fill-ink/5"
    >
      <title>{dayTitle(day)}</title>
    </rect>
  )
}

function DayLabels({
  days,
  scale,
}: {
  readonly days: readonly AdminEarningsDay[]
  readonly scale: ChartScale
}) {
  const indexes = [...new Set([0, Math.floor((days.length - 1) / 2), days.length - 1])]

  return (
    <div className="relative mt-1.5 h-4 text-[11.5px] text-muted">
      {indexes.map((index) => (
        <span
          key={index}
          className={labelClassName(index, days.length)}
          style={{ left: `${xOf(scale, index) * PERCENT}%` }}
        >
          {shortDate(days[index]?.day ?? '')}
        </span>
      ))}
    </div>
  )
}

function Legend({ hasAdSpend }: { readonly hasAdSpend: boolean }) {
  return (
    <figcaption className="mt-3 flex flex-wrap gap-4 text-[12px] text-muted">
      <span className="flex items-center gap-1.5">
        <span aria-hidden className="h-3 w-4 border-t-2 border-accent bg-accent-soft" />
        Все заказы
      </span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden className="h-0.5 w-4 bg-khaki-mark" />
        Забрали (фактический)
      </span>
      {hasAdSpend ? (
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="w-4 border-t-2 border-dashed border-alert" />
          Реклама
        </span>
      ) : null}
      <span className="max-sm:hidden">Наведите на день — суммы за него.</span>
    </figcaption>
  )
}

function chartScale(days: readonly AdminEarningsDay[]): ChartScale {
  const values = days.flatMap((day) => [day.allCents, day.collectedCents, day.adSpendCents ?? 0])
  return {
    count: days.length,
    step: days.length === 1 ? 1 : 1 / (days.length - 1),
    top: Math.max(...values, 0),
    bottom: Math.min(...values, 0),
  }
}

function xOf(scale: ChartScale, index: number): number {
  return scale.count === 1 ? 0.5 : index * scale.step
}

// A period without sales has no range: its zero line lies on the floor.
function yOf(scale: ChartScale, cents: number): number {
  const range = scale.top - scale.bottom
  return range === 0 ? PLOT_HEIGHT : ((scale.top - cents) / range) * PLOT_HEIGHT
}

function pointsOf(
  days: readonly AdminEarningsDay[],
  scale: ChartScale,
  pick: (day: AdminEarningsDay) => number,
): Point[] {
  return days.map((day, index) => ({ x: xOf(scale, index), y: yOf(scale, pick(day)) }))
}

function dayTitle(day: AdminEarningsDay): string {
  const earnings = `${shortDate(day.day)}: все ${money(day.allCents)}, забрали ${money(day.collectedCents)}`
  return day.adSpendCents === null ? earnings : `${earnings}, реклама ${money(day.adSpendCents)}`
}

function linePath(points: readonly Point[]): string {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`).join(' ')
}

function areaPath(points: readonly Point[], baseY: number): string {
  const first = points[0]
  const last = points[points.length - 1]
  if (!first || !last) return ''
  return `${linePath(points)} L${last.x},${baseY} L${first.x},${baseY} Z`
}

// The first and the last date line up with the plot's edges.
function labelClassName(index: number, count: number): string {
  if (index === 0 && count > 1) return 'absolute'
  if (index === count - 1 && count > 1) return 'absolute -translate-x-full'
  return 'absolute -translate-x-1/2'
}

function shortDate(day: string): string {
  return `${day.slice(8, 10)}.${day.slice(5, 7)}`
}

function money(cents: number): string {
  return formatMoney(createMoney(cents, Currency.Uah))
}
