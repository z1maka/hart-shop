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

export type AdSpendChartDay = {
  readonly day: string
  readonly costCents: number
}

const CHART_HEIGHT = 180

export function AdSpendDailyChart({ days }: { readonly days: readonly AdSpendChartDay[] }) {
  const byDay = useMemo(() => new Map(days.map((day) => [day.day, day])), [days])

  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <BarChart data={days} margin={CHART_MARGIN}>
        <CartesianGrid vertical={false} stroke={GRID_STROKE} />
        <XAxis {...DAY_AXIS} />
        <YAxis {...MONEY_AXIS} />
        <Tooltip
          cursor={CURSOR}
          content={(props: TooltipContentProps) => {
            const day = byDay.get(String(props.label))
            if (!props.active || !day) return null
            return (
              <ChartTooltip title={weekdayDay(day.day)}>
                <TooltipRow label="Потрачено" value={wholeMoney(day.costCents)} />
              </ChartTooltip>
            )
          }}
        />
        <Bar
          dataKey="costCents"
          name="Реклама"
          fill="var(--color-chart-ads)"
          radius={TOP_CORNERS}
          maxBarSize={MAX_BAR_WIDTH}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
