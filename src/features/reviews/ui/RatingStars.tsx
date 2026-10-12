import { cn } from '@/lib/utils'
import { MAX_RATING } from '@/features/reviews/model/review-summary'

type RatingStarsTone = 'light' | 'dark'

type RatingStarsProps = {
  readonly rating: number
  readonly label: string
  readonly size?: 'sm' | 'md' | 'lg'
  // The background the stars sit on: deep khaki reads on the light pages,
  // the light khaki on the dark summary block.
  readonly tone?: RatingStarsTone
  readonly className?: string
}

const SIZE_CLASSES = {
  sm: 'text-[12px] tracking-[0.02em]',
  md: 'text-[14px] tracking-[0.04em]',
  lg: 'text-[18px] tracking-[0.06em]',
} as const

const TONE_CLASSES: Record<RatingStarsTone, { filled: string; empty: string }> = {
  light: { filled: 'text-khaki-ink', empty: 'text-strong' },
  dark: { filled: 'text-khaki', empty: 'text-dark-edge' },
}

const STAR_POSITIONS = Array.from({ length: MAX_RATING }, (_, index) => index + 1)

// Five glyphs, the filled ones in khaki: one shape for the summary, the cards
// and the catalogue, so a rating reads the same everywhere.
export function RatingStars({
  rating,
  label,
  size = 'md',
  tone = 'light',
  className,
}: RatingStarsProps) {
  const toneClasses = TONE_CLASSES[tone]

  return (
    <span
      role="img"
      aria-label={label}
      className={cn('inline-flex leading-none', SIZE_CLASSES[size], className)}
    >
      {STAR_POSITIONS.map((position) => (
        <span key={position} aria-hidden className={position <= rating ? toneClasses.filled : toneClasses.empty}>
          ★
        </span>
      ))}
    </span>
  )
}
