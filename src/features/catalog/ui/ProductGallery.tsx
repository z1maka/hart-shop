'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useTranslations } from 'next-intl'
import { useSelectedColor } from '@/components/ui/SelectedColor'
import {
  coverIndexFor,
  galleryIndexFor,
  type GalleryPick,
  type ProductImageView,
} from '@/features/catalog/model/product-view'
import {
  clockDuration,
  youtubePlayerUrl,
  youtubeThumbnailUrl,
  type ProductVideo,
} from '@/features/catalog/model/product-video'
import { useGalleryVideoOpener } from '@/features/catalog/ui/GalleryVideoControl'
import { PlayIcon } from '@/features/catalog/ui/PlayIcon'
import { useDragScroll } from '@/features/catalog/ui/use-drag-scroll'
import { useSwipe } from '@/features/catalog/ui/use-swipe'
import { cn } from '@/lib/utils'

type ProductGalleryProps = {
  readonly images: readonly ProductImageView[]
  readonly title: string
  // Which shot each colour brings to the front when it is picked.
  readonly coverIndexByColor?: Readonly<Record<string, number>>
  // Videos, as slides after the photos.
  readonly videos?: readonly ProductVideo[]
}

const NO_COVERS: Readonly<Record<string, number>> = {}
const NO_VIDEOS: readonly ProductVideo[] = []

// True only after hydration. The server rendered the first shot, and the
// gallery has to hydrate as that same shot: a mismatch here would leave the
// page showing one photo while React believes in another.
const subscribeToNothing = () => () => undefined
const useIsHydrated = () =>
  useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  )

const MAIN_IMAGE_SIZES = '(min-width: 1024px) 620px, 100vw'
// The lightbox always fills the screen, so the browser may fetch the largest
// rendition without a media query.
const LIGHTBOX_IMAGE_SIZES = '100vw'

export function ProductGallery({
  images,
  title,
  coverIndexByColor = NO_COVERS,
  videos = NO_VIDEOS,
}: ProductGalleryProps) {
  const t = useTranslations('gallery')
  const { color } = useSelectedColor()
  const isHydrated = useIsHydrated()
  const [pick, setPick] = useState<GalleryPick | null>(null)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  // The video whose player was started; leaving its slide stops it for good.
  const [playingId, setPlayingId] = useState<string | null>(null)
  const stopVideo = useCallback(() => setPlayingId(null), [])
  const slideCount = images.length + videos.length
  const squareRef = useRef<HTMLDivElement>(null)
  const stripRef = useRef<HTMLDivElement>(null)

  // A thumbnail picked before the buy panel published its colour belongs to
  // the colour that arrives first, so that colour does not undo the click.
  if (pick !== null && pick.color === null && color !== null) {
    setPick({ index: pick.index, color })
  }

  // The colour on screen brings its own shot to the front; a thumbnail or
  // arrow then takes over for as long as that colour stays.
  const activeIndex = galleryIndexFor({
    pick,
    color,
    coverIndex: isHydrated ? coverIndexFor(coverIndexByColor, color) : undefined,
    count: slideCount,
  })
  const active = images[activeIndex]
  const activeVideo = active ? undefined : videos[activeIndex - images.length]
  const isVideoPlaying = activeVideo !== undefined && activeVideo.youtubeId === playingId

  // Whatever took the square away from a playing video — an arrow, a
  // thumbnail, a colour bringing its own shot — ended it. Coming back to that
  // slide shows the cover again rather than starting the sound unasked.
  if (playingId !== null && !isVideoPlaying) {
    setPlayingId(null)
  }

  const setActiveIndex = useCallback((index: number) => setPick({ index, color }), [color])

  // The description's shortcut: straight to the video, already playing, with
  // the square brought back into view when the page has scrolled past it.
  useGalleryVideoOpener((youtubeId) => {
    const offset = videos.findIndex((video) => video.youtubeId === youtubeId)
    if (offset < 0) return

    setPick({ index: images.length + offset, color })
    setPlayingId(youtubeId)
    if (squareRef.current) revealUnderHeader(squareRef.current)
  })

  // Arrows and keys step from whatever is on screen now. The key listener
  // reads the step through a ref, so it is attached once per lightbox session
  // rather than after every step.
  const stepRef = useRef<(offset: number) => void>(() => undefined)
  // The lightbox shows photos only, so there the arrows step through them.
  useEffect(() => {
    const count = isLightboxOpen ? images.length : slideCount
    stepRef.current = (offset) => setActiveIndex((activeIndex + offset + count) % count)
  })
  const showPrevious = () => stepRef.current(-1)
  const showNext = () => stepRef.current(1)
  // One swipe for the square and the lightbox: only one is on screen at a time.
  const swipeHandlers = useSwipe((offset) => stepRef.current(offset))
  const stripDragHandlers = useDragScroll(stripRef)

  useEffect(() => {
    if (!isLightboxOpen || images.length < 2) return

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'ArrowLeft') stepRef.current(-1)
      if (event.key === 'ArrowRight') stepRef.current(1)
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isLightboxOpen, images.length])

  // The strip scrolls, so the chosen thumbnail must follow the arrows into view.
  useEffect(() => {
    const strip = stripRef.current
    const thumb = strip?.children[activeIndex]
    if (strip && thumb instanceof HTMLElement) revealThumb(strip, thumb)
  }, [activeIndex])

  if (!active && !activeVideo) {
    return <div className="aspect-square w-full rounded-card bg-sunken" />
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        {...swipeHandlers}
        ref={squareRef}
        className="group relative aspect-square w-full touch-pan-y touch-pinch-zoom scroll-mt-24 overflow-hidden rounded-card bg-sunken"
      >
        {activeVideo ? (
          <GalleryVideo
            video={activeVideo}
            isPlaying={isVideoPlaying}
            onPlay={() => setPlayingId(activeVideo.youtubeId)}
            onStop={stopVideo}
          />
        ) : null}
        {active ? (
          <button
            type="button"
            onClick={() => setIsLightboxOpen(true)}
            aria-label={t('open')}
            className="absolute inset-0 cursor-zoom-in"
          >
            <Image
              src={active.url}
              alt={active.alt}
              fill
              sizes={MAIN_IMAGE_SIZES}
              // The page's LCP. `priority` is deprecated in Next 16 and only adds a
              // preload link without a fetch priority; the <img> is already in the
              // HTML, so a high fetch priority is all it needs.
              loading="eager"
              fetchPriority="high"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
            <span
              aria-hidden
              className="absolute right-3.5 bottom-3.5 flex size-10 items-center justify-center rounded-full bg-ink/55 text-on-dark opacity-0 transition-opacity group-hover:opacity-100"
            >
              <ZoomIcon />
            </span>
          </button>
        ) : null}

        {slideCount > 1 ? (
          <>
            <GalleryArrow label={t('previousSlide')} side="left" onClick={showPrevious}>
              ←
            </GalleryArrow>
            <GalleryArrow label={t('nextSlide')} side="right" onClick={showNext}>
              →
            </GalleryArrow>
            {/* Over a playing video the corner belongs to the player's own controls. */}
            {isVideoPlaying ? null : (
              <span className="absolute right-3 bottom-3 rounded-chip bg-ink/85 px-2.5 py-1 text-[12px] font-semibold text-on-dark">
                {t('counter', { current: activeIndex + 1, total: slideCount })}
              </span>
            )}
          </>
        ) : null}
      </div>

      {slideCount > 1 ? (
        <div
          ref={stripRef}
          {...stripDragHandlers}
          className="flex snap-x [scrollbar-width:none] gap-2.5 overflow-x-auto pb-1 select-none data-dragging:cursor-grabbing data-dragging:snap-none"
        >
          {images.map((image, index) => (
            <button
              key={image.url}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={t('showImage', { index: index + 1, title })}
              aria-current={index === activeIndex}
              className={cn(
                'relative size-16 shrink-0 snap-start overflow-hidden rounded-chip border bg-sunken',
                index === activeIndex ? 'border-accent' : 'border-subtle opacity-80',
              )}
            >
              <Image src={image.url} alt={image.alt} fill sizes="64px" className="object-cover" />
            </button>
          ))}
          {videos.map((video, offset) => {
            const index = images.length + offset
            return (
              <button
                key={video.youtubeId}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={t('showVideo', { caption: video.caption })}
                aria-current={index === activeIndex}
                className={cn(
                  'relative size-16 shrink-0 snap-start overflow-hidden rounded-chip border bg-ink',
                  index === activeIndex ? 'border-accent' : 'border-subtle opacity-80',
                )}
              >
                <Image
                  src={youtubeThumbnailUrl(video.youtubeId)}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-cover"
                />
                <span
                  aria-hidden
                  className="absolute inset-0 flex items-center justify-center bg-ink/25 text-on-dark"
                >
                  <PlayIcon size={18} />
                </span>
                <span className="absolute right-0.5 bottom-0.5 rounded-[4px] bg-ink/80 px-1 text-[9.5px] leading-[14px] font-semibold text-on-dark">
                  {clockDuration(video.durationSeconds)}
                </span>
              </button>
            )
          })}
        </div>
      ) : null}

      <DialogPrimitive.Root
        open={isLightboxOpen && Boolean(active)}
        onOpenChange={setIsLightboxOpen}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/92" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className="fixed inset-0 z-50 flex flex-col outline-none"
          >
            <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>

            <div className="flex items-center justify-between p-4 sm:px-6">
              <span className="text-[13px] font-semibold text-on-dark/80">
                {images.length > 1
                  ? t('counter', { current: activeIndex + 1, total: images.length })
                  : title}
              </span>
              <DialogPrimitive.Close
                aria-label={t('close')}
                className="flex size-11 items-center justify-center rounded-full border border-on-dark/30 text-on-dark hover:border-on-dark/70"
              >
                ✕
              </DialogPrimitive.Close>
            </div>

            <div
              {...swipeHandlers}
              className="relative min-h-0 flex-1 touch-pan-y touch-pinch-zoom"
            >
              {active ? (
                <Image
                  key={active.url}
                  src={active.url}
                  alt={active.alt}
                  fill
                  sizes={LIGHTBOX_IMAGE_SIZES}
                  className="object-contain"
                />
              ) : null}

              {images.length > 1 ? (
                <>
                  <LightboxArrow label={t('previous')} side="left" onClick={showPrevious}>
                    ←
                  </LightboxArrow>
                  <LightboxArrow label={t('next')} side="right" onClick={showNext}>
                    →
                  </LightboxArrow>
                </>
              ) : null}
            </div>

            {images.length > 1 ? (
              <LightboxStrip
                images={images}
                activeIndex={activeIndex}
                title={title}
                onPick={setActiveIndex}
              />
            ) : null}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  )
}

// Sideways, inside the strip only. The thumbnail's own scrollIntoView would
// move the page as well, pulling it away from the square a swipe or the
// description's shortcut has just brought into view.
function revealThumb(strip: HTMLElement, thumb: HTMLElement) {
  const stripBox = strip.getBoundingClientRect()
  const thumbBox = thumb.getBoundingClientRect()
  const hiddenOnLeft = thumbBox.left - stripBox.left
  const hiddenOnRight = thumbBox.right - stripBox.right

  if (hiddenOnLeft < 0) strip.scrollBy({ left: hiddenOnLeft, behavior: 'smooth' })
  else if (hiddenOnRight > 0) strip.scrollBy({ left: hiddenOnRight, behavior: 'smooth' })
}

// Scrolls only when some of the element is hidden, under the sticky header
// (its scroll margin) or below the fold, and then puts its top just under
// that header.
function revealUnderHeader(element: HTMLElement) {
  const { top, bottom } = element.getBoundingClientRect()
  const headerHeight = Number.parseFloat(getComputedStyle(element).scrollMarginTop)
  const isFullyVisible = top >= headerHeight && bottom <= window.innerHeight
  if (!isFullyVisible) element.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// A dozen thumbnails never fit a phone in one row, so the row scrolls inside
// its own container and keeps the active one in sight.
function LightboxStrip({
  images,
  activeIndex,
  title,
  onPick,
}: {
  readonly images: readonly ProductImageView[]
  readonly activeIndex: number
  readonly title: string
  readonly onPick: (index: number) => void
}) {
  const t = useTranslations('gallery')
  const stripRef = useRef<HTMLDivElement>(null)
  const dragHandlers = useDragScroll(stripRef)

  useEffect(() => {
    const thumb = stripRef.current?.children[activeIndex]
    if (thumb instanceof HTMLElement) {
      thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [activeIndex])

  return (
    <div
      ref={stripRef}
      {...dragHandlers}
      className="mx-auto flex w-full max-w-full snap-x [scrollbar-width:none] gap-2.5 overflow-x-auto p-4 select-none data-dragging:cursor-grabbing data-dragging:snap-none sm:w-auto"
    >
      {images.map((image, index) => (
        <button
          key={image.url}
          type="button"
          onClick={() => onPick(index)}
          aria-label={t('showImage', { index: index + 1, title })}
          aria-current={index === activeIndex}
          className={cn(
            'relative size-14 shrink-0 snap-start overflow-hidden rounded-chip border-2 bg-sunken',
            index === activeIndex ? 'border-accent' : 'border-transparent opacity-60',
          )}
        >
          <Image src={image.url} alt={image.alt} fill sizes="56px" className="object-cover" />
        </button>
      ))}
    </div>
  )
}

// YouTube plays for as long as its iframe holds the video, and the App
// Router keeps a page the visitor left mounted but hidden (React Activity)
// so the way back is instant — the sound carried on under the next page.
// Hiding runs effect cleanups, so the player gets and loses its source
// through an effect: silence the moment the page is hidden or the slide
// changes, and the cover again when the page comes back.
function GalleryPlayer({
  video,
  onStop,
}: {
  readonly video: ProductVideo
  readonly onStop: () => void
}) {
  const playerRef = useRef<HTMLIFrameElement>(null)
  // Development runs every effect twice (cleanup, then again at once); the
  // stop is deferred a tick so that rehearsal cancels it, while a real hide
  // or unmount lets it through.
  const stopTimerRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    const player = playerRef.current
    if (!player) return

    window.clearTimeout(stopTimerRef.current)
    player.src = youtubePlayerUrl(video.youtubeId)
    // The player replaces the button that started it, and keyboard focus
    // would otherwise fall back to the top of the page. The page scrolls on
    // its own terms, so focusing must not jump it.
    player.focus({ preventScroll: true })

    return () => {
      player.src = 'about:blank'
      stopTimerRef.current = window.setTimeout(onStop, 0)
    }
  }, [video.youtubeId, onStop])

  return (
    <iframe
      ref={playerRef}
      title={video.caption}
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
      className="absolute inset-0 size-full bg-ink"
    />
  )
}

// A video slide: its cover and a play button until pressed, then YouTube's
// privacy-enhanced player in the same square. The player is never loaded for
// a visit that does not ask for it.
function GalleryVideo({
  video,
  isPlaying,
  onPlay,
  onStop,
}: {
  readonly video: ProductVideo
  readonly isPlaying: boolean
  readonly onPlay: () => void
  readonly onStop: () => void
}) {
  const t = useTranslations('gallery')

  if (isPlaying) {
    return <GalleryPlayer video={video} onStop={onStop} />
  }

  return (
    <button
      type="button"
      onClick={onPlay}
      aria-label={t('playVideo', { caption: video.caption })}
      className="absolute inset-0 bg-ink"
    >
      <Image
        src={youtubeThumbnailUrl(video.youtubeId)}
        alt=""
        fill
        sizes={MAIN_IMAGE_SIZES}
        className="object-cover opacity-90"
      />
      <span
        aria-hidden
        className="absolute top-1/2 left-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-ink/75 text-on-dark"
      >
        <PlayIcon size={26} />
      </span>
      <span className="absolute inset-x-3.5 top-3.5 text-left text-[13px] leading-snug font-semibold text-on-dark [text-shadow:0_1px_3px_rgb(0_0_0/0.7)]">
        {video.caption} · {clockDuration(video.durationSeconds)}
      </span>
    </button>
  )
}

function GalleryArrow({
  label,
  side,
  onClick,
  children,
}: {
  label: string
  side: 'left' | 'right'
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'absolute top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full',
        'border border-subtle bg-surface/90 text-[15px] text-ink shadow-card hover:border-accent hover:text-ink',
        side === 'left' ? 'left-3' : 'right-3',
      )}
    >
      {children}
    </button>
  )
}

function LightboxArrow({
  label,
  side,
  onClick,
  children,
}: {
  label: string
  side: 'left' | 'right'
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'absolute top-1/2 z-10 flex size-12 -translate-y-1/2 items-center justify-center rounded-full',
        'border border-on-dark/30 bg-ink/45 text-[17px] text-on-dark hover:border-on-dark/70',
        side === 'left' ? 'left-3 sm:left-5' : 'right-3 sm:right-5',
      )}
    >
      {children}
    </button>
  )
}

function ZoomIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden>
      <circle cx="7.5" cy="7.5" r="5" stroke="currentColor" strokeWidth="1.6" />
      <path d="m11.5 11.5 3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M7.5 5.5v4M5.5 7.5h4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}
