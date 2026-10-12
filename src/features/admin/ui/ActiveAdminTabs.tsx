'use client'

import { usePathname } from 'next/navigation'
import type { TabBadges } from '@/features/admin/queries/get-admin-stats'
import { TabList } from '@/features/admin/ui/AdminTabList'

export function ActiveAdminTabs({ badges }: { readonly badges: TabBadges }) {
  return <TabList activeHref={usePathname()} badges={badges} />
}
