import type { Metadata } from 'next'
import { bodyFont, displayFont } from '@/app/fonts'
import { env } from '@/lib/env'
import { cn } from '@/lib/utils'
import '../globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  title: { default: 'Админка', template: '%s · FOX Admin' },
  robots: { index: false, follow: false },
}

// Its own root: the panel speaks Russian and lives outside the locale tree.
export default function AdminLayout({ children }: LayoutProps<'/admin'>) {
  return (
    <html lang="ru" className={cn('h-full', displayFont.variable, bodyFont.variable)}>
      <body className="flex min-h-full flex-col">
        <div className="min-h-full flex-1 bg-canvas">{children}</div>
      </body>
    </html>
  )
}
