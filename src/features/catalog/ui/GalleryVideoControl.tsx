'use client'

import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react'

type VideoOpener = (videoId: string) => void

type GalleryVideoControl = {
  readonly openVideo: VideoOpener
  readonly setOpener: (opener: VideoOpener | null) => void
}

// A button beside the description plays a video in the gallery, which on a
// wide screen sits in the other column. The gallery hands over how it opens one; outside a provider, or
// before the gallery has hydrated, the button does nothing.
const GalleryVideoControlContext = createContext<GalleryVideoControl>({
  openVideo: () => undefined,
  setOpener: () => undefined,
})

export function GalleryVideoControlProvider({ children }: { readonly children: ReactNode }) {
  const openerRef = useRef<VideoOpener | null>(null)
  const value = useMemo<GalleryVideoControl>(
    () => ({
      openVideo: (videoId) => openerRef.current?.(videoId),
      setOpener: (opener) => {
        openerRef.current = opener
      },
    }),
    [],
  )

  return (
    <GalleryVideoControlContext.Provider value={value}>
      {children}
    </GalleryVideoControlContext.Provider>
  )
}

export function useOpenGalleryVideo(): VideoOpener {
  return useContext(GalleryVideoControlContext).openVideo
}

// The opener closes over the gallery's current state, so it is handed over
// again after every render and withdrawn when the gallery leaves the page.
export function useGalleryVideoOpener(opener: VideoOpener): void {
  const { setOpener } = useContext(GalleryVideoControlContext)

  useEffect(() => {
    setOpener(opener)
    return () => setOpener(null)
  })
}
