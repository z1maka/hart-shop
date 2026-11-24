import { formatPrice, type Money } from '@/lib/money'
import { cn } from '@/lib/utils'

type PriceSize = 'sm' | 'md' | 'lg'

type PriceProps = {
  readonly money: Money
  // The pre-sale price, struck through next to the current one.
  readonly compareAt?: Money | null
  readonly size?: PriceSize
  readonly note?: string
  readonly className?: string
}

const SIZE_CLASSES: Record<PriceSize, string> = {
  sm: 'text-body',
  md: 'text-title',
  lg: 'text-[36px] font-semibold leading-none',
}

export function Price({ money, compareAt = null, size = 'md', note, className }: PriceProps) {
  return (
    <div className={className}>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className={cn('font-display font-semibold text-ink', SIZE_CLASSES[size])}>
          {formatPrice(money)}
        </span>
        {compareAt ? (
          <s className="text-[0.72em] font-medium text-faint">{formatPrice(compareAt)}</s>
        ) : null}
      </div>
      {note ? <div className="mt-1 text-caption text-faint">{note}</div> : null}
    </div>
  )
}
