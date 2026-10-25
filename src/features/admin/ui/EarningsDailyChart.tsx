'use client'

import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts'
import { ChartTooltip, TooltipRow } from '@/features/admin/ui/ChartTooltip'
import {
  CHART_MARGIN,
  CURSOR,
  DAY_AXIS,
  GRID_STROKE,
  MAX_BAR_WIDTH,
  MONEY_AXIS,
  TOP_CORNERS,
} from '@/features/admin/ui/chart-style'
import { weekdayDay, wholeMoney } from '@/features/admin/ui/stats-format'

export type EarningsChartDay = {
  readonly day: string
  readonly collectedCents: number
  readonly pendingCents: number
  readonly orders: number
}

const CHART_HEIGHT = 260

// Each day's earnings as one column: the part already collected below, the
// part still on its way stacked on top, so the column is the day's total.
export function EarningsDailyChart({ days }: { readonly days: readonly EarningsChartDay[] }) {
  const byDay = useMemo(() => new Map(days.map((day) => [day.day, day])), [days])

  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <BarChart data={days} stackOffset="sign" margin={CHART_MARGIN}>
        <CartesianGrid vertical={false} stroke={GRID_STROKE} />
        <XAxis {...DAY_AXIS} />
        <YAxis {...MONEY_AXIS} />
        <Tooltip
          cursor={CURSOR}
          content={(props: TooltipContentProps) => (
            <EarningsTooltip day={byDay.get(String(props.label))} isActive={props.active} />
          )}
        />
        <Bar
          dataKey="collectedCents"
          name="Забрали"
          stackId="earnings"
          fill="var(--color-chart-collected)"
          maxBarSize={MAX_BAR_WIDTH}
        />
        <Bar
          dataKey="pendingCents"
          name="Ещё не забрали"
          stackId="earnings"
          fill="var(--color-chart-pending)"
          stroke="var(--color-surface)"
          strokeWidth={1}
          radius={TOP_CORNERS}
          maxBarSize={MAX_BAR_WIDTH}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

function EarningsTooltip({
  day,
  isActive,
}: {
  readonly day: EarningsChartDay | undefined
  readonly isActive: boolean
}) {
  if (!isActive || !day) return null

  return (
    <ChartTooltip title={weekdayDay(day.day)}>
      <TooltipRow label="Заработок" value={wholeMoney(day.collectedCents + day.pendingCents)} />
      <TooltipRow
        label="Забрали"
        value={wholeMoney(day.collectedCents)}
        swatchClassName="bg-chart-collected"
      />
      <TooltipRow
        label="Ещё не забрали"
        value={wholeMoney(day.pendingCents)}
        swatchClassName="bg-chart-pending"
      />
      <TooltipRow label="Заказов" value={String(day.orders)} />
    </ChartTooltip>
  )
}
