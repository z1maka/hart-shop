'use client'

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

export type SelectedColor = {
  readonly color: string | null
  readonly setColor: (color: string) => void
}

// The colour chosen on a page, for parts that sit in different columns of
// it: a picker publishes, a gallery follows. Outside a provider the colour
// is simply unknown, so a picker or gallery on its own keeps working.
const SelectedColorContext = createContext<SelectedColor>({
  color: null,
  setColor: () => undefined,
})

export function SelectedColorProvider({ children }: { readonly children: ReactNode }) {
  const [color, setColor] = useState<string | null>(null)
  const value = useMemo(() => ({ color, setColor }), [color])

  return <SelectedColorContext.Provider value={value}>{children}</SelectedColorContext.Provider>
}

export function useSelectedColor(): SelectedColor {
  return useContext(SelectedColorContext)
}
