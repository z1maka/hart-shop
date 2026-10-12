import { cn } from '@/lib/utils'
import { MAX_RATING } from '@/features/reviews/model/review-summary'

type RatingStarsProps = {
  readonly rating: number
  readonly label: string
  readonly size?: 'sm' | 'md' | 'lg'
  readonly className?: string
}

const SIZE_CLASSES = {
  sm: 'text-[12px] tracking-[0.02em]',
  md: 'text-[14px] tracking-[0.04em]',
  lg: 'text-[18px] tracking-[0.06em]',
} as const

const STAR_POSITIONS = Array.from({ length: MAX_RATING }, (_, index) => index + 1)

// Five glyphs, the filled ones in ink: one shape for the summary, the cards
// and the catalogue, so a rating reads the same everywhere.
export function RatingStars({ rating, label, size = 'md', className }: RatingStarsProps) {
  return (
    <span
      role="img"
      aria-label={label}
      className={cn('inline-flex leading-none', SIZE_CLASSES[size], className)}
    >
      {STAR_POSITIONS.map((position) => (
        <span key={position} aria-hidden className={position <= rating ? 'text-khaki-ink' : 'text-strong'}>
          ★
        </span>
      ))}
    </span>
  )
}
