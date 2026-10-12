import Image from 'next/image'
import { cn } from '@/lib/utils'

type WordmarkTone = 'ink' | 'light'

type WordmarkProps = {
  readonly tone?: WordmarkTone
  readonly height?: number
  readonly isPriority?: boolean
  readonly className?: string
}

const LOGO_ASPECT_RATIO = 658 / 379

export function Wordmark({
  tone = 'ink',
  height = 34,
  isPriority = false,
  className,
}: WordmarkProps) {
  return (
    <span className={cn('inline-flex items-start', className)}>
      <Image
        src={tone === 'light' ? '/logo-fox-light.png' : '/logo-fox.png'}
        alt="FOX Armor"
        width={Math.round(height * LOGO_ASPECT_RATIO)}
        height={height}
        priority={isPriority}
        className="block"
        // Both dimensions are fixed so the browser reserves the box before the
        // file loads; `width: auto` here scored CLS 0.686 in Lighthouse.
        style={{ height, width: Math.round(height * LOGO_ASPECT_RATIO) }}
      />
    </span>
  )
}
