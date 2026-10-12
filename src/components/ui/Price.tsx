import { formatMoney, type Money } from '@/lib/money'
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
  sm: 'text-[15px]',
  md: 'text-[19px]',
  lg: 'text-[26px]',
}

export function Price({ money, compareAt = null, size = 'md', note, className }: PriceProps) {
  return (
    <div className={className}>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className={cn('font-display font-bold text-ink', SIZE_CLASSES[size])}>
          {formatMoney(money)}
        </span>
        {compareAt ? (
          <s className="text-[0.72em] font-medium text-faint">{formatMoney(compareAt)}</s>
        ) : null}
      </div>
      {note ? <div className="mt-1 text-[11.5px] text-faint">{note}</div> : null}
    </div>
  )
}
