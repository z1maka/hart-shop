import type { Metadata } from 'next'
import uk from '@/messages/uk.json'
import { getTranslations } from 'next-intl/server'
import { bodyFont, displayFont } from '@/app/fonts'
import { IntlProvider } from '@/i18n/IntlProvider'
import { env } from '@/lib/env'
import { cn } from '@/lib/utils'
import './globals.css'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta')

  return {
    metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
    title: { default: t('siteName'), template: `%s · ${t('siteName')}` },
    description: t('defaultDescription'),
  }
}

// Handed to the provider statically: letting it read the request config on
// its own would make every page dynamic at the html tag.
export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="uk" className={cn('h-full', displayFont.variable, bodyFont.variable)}>
      <body className="flex min-h-full flex-col">
        <IntlProvider locale="uk" messages={uk}>
          {children}
        </IntlProvider>
      </body>
    </html>
  )
}
