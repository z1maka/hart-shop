import type { Metadata } from 'next'
import { siteConfig } from '@/config/site'
import { env } from '@/lib/env'

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  title: { default: 'Админка', template: `%s · ${siteConfig.name} Admin` },
  robots: { index: false, follow: false },
}

// The root layout owns <html> and <body> for every route, the panel included;
// a second pair here nested inside them. The panel speaks Russian, so it marks
// its own subtree instead.
export default function AdminLayout({ children }: LayoutProps<'/admin'>) {
  return (
    <div lang="ru" className="min-h-full flex-1 bg-canvas">
      {children}
    </div>
  )
}
