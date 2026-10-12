'use client'

import { NextIntlClientProvider } from 'next-intl'
import type { ReactNode } from 'react'

type IntlProviderProps = {
  readonly locale: string
  readonly messages: Record<string, unknown>
  readonly children: ReactNode
}

// Rendered from a client boundary on purpose: in a Server Component the
// provider inherits every prop it was not given from the request config, and
// that read makes the whole page dynamic at the html tag. On the client there
// is no server config to inherit from, so what we pass is all it uses.
export function IntlProvider({ locale, messages, children }: IntlProviderProps) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="Europe/Kyiv">
      {children}
    </NextIntlClientProvider>
  )
}
