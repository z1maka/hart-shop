'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

type ProductRailProps = {
  readonly children: readonly ReactNode[]
}

const SCROLL_RATIO = 0.9

// The card width is derived from the container so every breakpoint shows a
// whole number of cards — a half-cut card reads as a layout bug, not a hint.
const CARD_WIDTH = cn(
  'w-full shrink-0 snap-start',
  'sm:w-[calc((100%-1.25rem)/2)]',
  'md:w-[calc((100%-2.5rem)/3)]',
  'lg:w-[calc((100%-3.75rem)/4)]',
  'min-[1440px]:w-[calc((100%-5rem)/5)]',
)

export function ProductRail({ children }: ProductRailProps) {
  const t = useTranslations('home')
  const trackRef = useRef<HTMLDivElement>(null)
  const [canScrollBack, setCanScrollBack] = useState(false)
  const [canScrollForward, setCanScrollForward] = useState(false)
  const [arrowTop, setArrowTop] = useState<number | null>(null)

  const updateArrows = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    setCanScrollBack(track.scrollLeft > 8)
    setCanScrollForward(track.scrollLeft + track.clientWidth < track.scrollWidth - 8)

    // Centred on the photo, not on the card: the text block below the image
    // would otherwise drag the arrows visually off-centre.
    const image = track.querySelector('img')
    if (image) setArrowTop(image.getBoundingClientRect().height / 2)
  }, [])

  useEffect(() => {
    updateArrows()
    const track = trackRef.current
    if (!track) return

    const observer = new ResizeObserver(updateArrows)
    observer.observe(track)
    return () => observer.disconnect()
  }, [updateArrows])

  function scrollByViewport(direction: 1 | -1) {
    const track = trackRef.current
    if (!track) return
    track.scrollBy({ left: direction * track.clientWidth * SCROLL_RATIO, behavior: 'smooth' })
  }

  return (
    <div className="relative">
      <div
        ref={trackRef}
        onScroll={updateArrows}
        className="flex snap-x snap-mandatory [scrollbar-width:none] gap-5 overflow-x-auto pb-2"
      >
        {children.map((child, index) => (
          <div key={index} className={CARD_WIDTH}>
            {child}
          </div>
        ))}
      </div>

      {canScrollBack ? (
        <RailArrow
          label={t('railPrev')}
          side="left"
          top={arrowTop}
          onClick={() => scrollByViewport(-1)}
        >
          ←
        </RailArrow>
      ) : null}
      {canScrollForward ? (
        <RailArrow
          label={t('railNext')}
          side="right"
          top={arrowTop}
          onClick={() => scrollByViewport(1)}
        >
          →
        </RailArrow>
      ) : null}
    </div>
  )
}

function RailArrow({
  label,
  side,
  top,
  onClick,
  children,
}: {
  label: string
  side: 'left' | 'right'
  top: number | null
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      style={top === null ? undefined : { top }}
      className={cn(
        'absolute z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full',
        top === null && 'top-1/3',
        'border border-subtle bg-surface text-[16px] text-ink shadow-card transition-colors',
        'hover:border-accent hover:text-accent-hover',
        side === 'left' ? '-left-3' : '-right-3',
      )}
    >
      {children}
    </button>
  )
}
