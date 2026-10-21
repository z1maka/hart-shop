'use client'

import { useTranslations } from 'next-intl'
import { SizeGuideDialog } from '@/components/ui/SizeGuideDialog'
import { sizeGuideRowsFor } from '@/config/size-guide'
import {
  sizeAxisOf,
  sizeDimensionsOf,
  sizeNoteOf,
  type OptionDimensions,
} from '@/config/variant-size'
import { cn } from '@/lib/utils'

export type SizeOption = {
  readonly size: string
  readonly isAvailable: boolean
}

type SizePickerProps = {
  readonly options: readonly SizeOption[]
  readonly activeSize: string | null
  readonly onSelect: (size: string) => void
}

type OptionListProps = SizePickerProps

// The glyph's drawing box; the widest option fills it, the rest keep scale.
const GLYPH_WIDTH = 34
const GLYPH_HEIGHT = 26
const GLYPH_PADDING = 4

// The second choice under the colours. Options that carry a measure (a
// Starlink model and its dish) are tiles that show it; plain sizes stay a
// compact row of buttons with the size table beside them.
export function SizePicker({ options, activeSize, onSelect }: SizePickerProps) {
  const t = useTranslations('addToCart')
  const sizes = options.map((option) => option.size)
  const guideRows = sizeGuideRowsFor(sizes)
  const hasMeasures = sizes.some((size) => sizeDimensionsOf(size) !== null)
  const OptionList = hasMeasures ? MeasuredOptions : PlainOptions

  return (
    <div>
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] font-bold text-ink">{t(sizeAxisOf(sizes))}</p>
        {guideRows.length > 0 ? <SizeGuideDialog rows={guideRows} /> : null}
      </div>
      <OptionList options={options} activeSize={activeSize} onSelect={onSelect} />
    </div>
  )
}

function MeasuredOptions({ options, activeSize, onSelect }: OptionListProps) {
  const widestMm = Math.max(
    ...options.map((option) => sizeDimensionsOf(option.size)?.widthMm ?? 0),
  )

  return (
    <div className="grid max-w-110 grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-2">
      {options.map(({ size, isAvailable }) => {
        const isActive = size === activeSize
        const dimensions = sizeDimensionsOf(size)

        return (
          <button
            key={size}
            type="button"
            disabled={!isAvailable}
            onClick={() => onSelect(size)}
            aria-pressed={isActive}
            className={cn(
              'relative flex min-h-15 items-center gap-3 rounded-option border px-3 py-2.5 text-left transition-[border-color,background-color,box-shadow]',
              isActive
                ? 'border-ink bg-accent-tint shadow-[inset_0_0_0_1px_var(--color-ink)]'
                : 'border-strong bg-raised hover:border-ink',
              !isAvailable && 'cursor-not-allowed border-subtle bg-surface opacity-60',
            )}
          >
            {dimensions ? (
              <DishGlyph
                dimensions={dimensions}
                widestMm={widestMm}
                className={isActive ? 'text-ink' : 'text-accent-edge'}
              />
            ) : null}
            <span className="flex min-w-0 flex-col gap-0.5">
              <span
                className={cn(
                  'text-[14px] leading-tight font-bold whitespace-nowrap text-ink',
                  !isAvailable && 'line-through',
                )}
              >
                {size}
              </span>
              <span className="text-[12px] leading-tight font-medium text-muted tabular-nums">
                {sizeNoteOf(size)}
              </span>
            </span>
            {isActive ? <SelectedMark /> : null}
          </button>
        )
      })}
    </div>
  )
}

function PlainOptions({ options, activeSize, onSelect }: OptionListProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(({ size, isAvailable }) => {
        const isActive = size === activeSize

        return (
          <button
            key={size}
            type="button"
            disabled={!isAvailable}
            onClick={() => onSelect(size)}
            aria-pressed={isActive}
            className={cn(
              'min-h-11.5 rounded-option border-[1.5px] px-5 text-[13.5px] font-bold transition-colors',
              isActive
                ? 'border-ink bg-ink text-on-dark'
                : 'border-strong bg-raised text-ink hover:border-ink',
              !isAvailable && 'cursor-not-allowed border-subtle bg-surface text-strong line-through',
            )}
          >
            {size}
          </button>
        )
      })}
    </div>
  )
}

// The dish drawn to scale against the widest one on offer, so the bigger
// terminal reads bigger before its numbers are read.
function DishGlyph({
  dimensions,
  widestMm,
  className,
}: {
  readonly dimensions: OptionDimensions
  readonly widestMm: number
  readonly className?: string
}) {
  const scale = (GLYPH_WIDTH - GLYPH_PADDING) / widestMm
  const width = dimensions.widthMm * scale
  const height = dimensions.heightMm * scale

  return (
    <span
      aria-hidden
      className="flex size-10 shrink-0 items-center justify-center rounded-control bg-sunken"
    >
      <svg viewBox={`0 0 ${GLYPH_WIDTH} ${GLYPH_HEIGHT}`} className={cn('h-6.5 w-8.5', className)}>
        <rect
          x={(GLYPH_WIDTH - width) / 2}
          y={(GLYPH_HEIGHT - height) / 2}
          width={width}
          height={height}
          rx={2}
          fill="currentColor"
          fillOpacity={0.18}
          stroke="currentColor"
          strokeWidth={1.5}
        />
      </svg>
    </span>
  )
}

function SelectedMark() {
  return (
    <span
      aria-hidden
      className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-ink text-on-dark"
    >
      <svg viewBox="0 0 12 12" className="size-2.5">
        <path
          d="M2.5 6.2 5 8.5l4.5-5"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}
