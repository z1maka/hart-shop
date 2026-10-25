import { axisMoney, shortDay } from '@/features/admin/ui/stats-format'

// One look for every stats chart: thin columns with a rounded top, a quiet
// grid and axes in the faint text colour.

export const MAX_BAR_WIDTH = 24
export const TOP_CORNERS: [number, number, number, number] = [4, 4, 0, 0]
export const CHART_MARGIN = { top: 8, right: 4, left: 0 }
export const GRID_STROKE = 'var(--color-subtle)'
export const CURSOR = { fill: 'var(--color-hover)' }

const AXIS_TICK = { fontSize: 11.5, fill: 'var(--color-faint)' }
const VALUE_AXIS_WIDTH = 52
const DAY_LABEL_GAP = 24

export const DAY_AXIS = {
  dataKey: 'day',
  tickFormatter: shortDay,
  tick: AXIS_TICK,
  tickLine: false,
  axisLine: { stroke: 'var(--color-strong)' },
  interval: 'preserveStartEnd',
  minTickGap: DAY_LABEL_GAP,
} as const

export const MONEY_AXIS = {
  tickFormatter: axisMoney,
  tick: AXIS_TICK,
  tickLine: false,
  axisLine: false,
  width: VALUE_AXIS_WIDTH,
} as const
