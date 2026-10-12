import { SiteShell } from '@/app/SiteShell'

export default function ShopLayout({ children }: LayoutProps<'/'>) {
  return <SiteShell>{children}</SiteShell>
}
