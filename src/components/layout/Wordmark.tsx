import Image from 'next/image'
import { siteConfig } from '@/config/site'
import { cn } from '@/lib/utils'

type WordmarkTone = 'ink' | 'light'

type WordmarkProps = {
  readonly tone?: WordmarkTone
  readonly height?: number
  // Above the fold on every page (the header): fetched at once instead of lazily.
  readonly isEager?: boolean
  readonly className?: string
}

// The brand kit's horizontal lockup comes in two colourways: Ranger Green for
// light backgrounds and the original stone-and-olive for dark ones. Raster
// files until the vector master exists.
const LOGO_SRC: Record<WordmarkTone, string> = {
  ink: '/logo/hart-horizontal-dark.png',
  light: '/logo/hart-horizontal.png',
}
const LOGO_ASPECT_RATIO = 683 / 160

export function Wordmark({ tone = 'ink', height = 34, isEager = false, className }: WordmarkProps) {
  const width = Math.round(height * LOGO_ASPECT_RATIO)

  return (
    <Image
      src={LOGO_SRC[tone]}
      alt={siteConfig.name}
      width={width}
      height={height}
      loading={isEager ? 'eager' : 'lazy'}
      className={cn('block', className)}
      // Both dimensions are fixed so the browser reserves the box before the
      // file loads; `width: auto` here scored CLS 0.686 in Lighthouse.
      style={{ height, width }}
    />
  )
}
