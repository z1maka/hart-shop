import { SiteShell } from '@/app/SiteShell'

// Guides and landing pages: the same shell as the shop, kept in their own
// segment so marketing pages never touch the catalogue routes (AGENTS.md §9).
export default function ContentLayout({ children }: LayoutProps<'/'>) {
  return <SiteShell>{children}</SiteShell>
}
