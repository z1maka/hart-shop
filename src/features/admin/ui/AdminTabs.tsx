import { Suspense } from 'react'
import { getAdminTabBadges } from '@/features/admin/queries/get-admin-stats'
import { ActiveAdminTabs } from '@/features/admin/ui/ActiveAdminTabs'
import { TabList } from '@/features/admin/ui/AdminTabList'

export async function AdminTabs() {
  // The badges come from the database; the highlight needs the current path,
  // which only the client knows. The fallback carries the same links and
  // badges, so the shell is complete without it.
  const badges = await getAdminTabBadges()

  return (
    <Suspense fallback={<TabList activeHref={null} badges={badges} />}>
      <ActiveAdminTabs badges={badges} />
    </Suspense>
  )
}
