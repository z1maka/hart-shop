import { siteConfig } from '@/config/site'
import { cn } from '@/lib/utils'

type WordmarkTone = 'ink' | 'light'

type WordmarkProps = {
  readonly tone?: WordmarkTone
  readonly height?: number
  readonly className?: string
}

// A stand-in until the new identity lands. The letters are drawn as paths
// because the display font has no Cyrillic: set as text, the name would fall
// back to a different system font on every platform.
const VIEWBOX_WIDTH = 272
const VIEWBOX_HEIGHT = 100
export const WORDMARK_PATH =
  'M0 0H62V22H22V100H0Z' +
  'M52 100L76 0H102L126 100H104L99.2 80H78.8L74 100ZM83.6 60H94.4L89 37.5Z' +
  'M134 0H167A31 31 0 0 1 167 62H156V100H134ZM156 20H167A11 11 0 0 1 167 42H156Z' +
  'M206 0H272V22H250V100H228V22H206Z'

export const WORDMARK_VIEWBOX = `0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`

export function wordmarkWidth(height: number): number {
  return Math.round((height * VIEWBOX_WIDTH) / VIEWBOX_HEIGHT)
}

const TONE_CLASS: Record<WordmarkTone, string> = {
  ink: 'text-ink',
  light: 'text-on-dark',
}

export function Wordmark({ tone = 'ink', height = 34, className }: WordmarkProps) {
  return (
    <svg
      role="img"
      aria-label={siteConfig.name}
      viewBox={WORDMARK_VIEWBOX}
      width={wordmarkWidth(height)}
      height={height}
      className={cn('block fill-current', TONE_CLASS[tone], className)}
    >
      <path fillRule="evenodd" d={WORDMARK_PATH} />
    </svg>
  )
}
