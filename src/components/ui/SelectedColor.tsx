'use client'

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

export type SelectedColor = {
  readonly color: string | null
  // The buyer's own choice — a pick in the panel or the colour a link asked
  // for — rather than the colour the panel opens with.
  readonly isChosen: boolean
  readonly setColor: (color: string, isChosen: boolean) => void
}

// The colour chosen on a page, for parts that sit in different columns of
// it: a picker publishes, a gallery follows. Outside a provider the colour
// is simply unknown, so a picker or gallery on its own keeps working.
const SelectedColorContext = createContext<SelectedColor>({
  color: null,
  isChosen: false,
  setColor: () => undefined,
})

export function SelectedColorProvider({ children }: { readonly children: ReactNode }) {
  const [selected, setSelected] = useState<{ color: string | null; isChosen: boolean }>({
    color: null,
    isChosen: false,
  })
  const value = useMemo(
    () => ({
      ...selected,
      setColor: (color: string, isChosen: boolean) => setSelected({ color, isChosen }),
    }),
    [selected],
  )

  return <SelectedColorContext.Provider value={value}>{children}</SelectedColorContext.Provider>
}

export function useSelectedColor(): SelectedColor {
  return useContext(SelectedColorContext)
}
