import { Suspense } from 'react'
import Link from 'next/link'
import { getAdminStats, readAdminSession, signOutAction } from '@/features/admin'
import { NO_BADGES, TabList } from '@/features/admin/ui/AdminTabList'
import { AdminTabs } from '@/features/admin/ui/AdminTabs'
import { cn } from '@/lib/utils'

export default function AdminDashboardLayout({ children }: LayoutProps<'/admin'>) {
  return (
    <div className="flex min-h-full flex-col bg-canvas">
      <header className="bg-ink px-7 py-6 text-on-dark">
        <div className="flex flex-wrap items-end justify-between gap-3.5">
          <div>
            <p className="mb-2.5 text-[12px] font-semibold text-footer-label">
              Внутренний доступ · только для персонала
            </p>
            <h1 className="font-display text-h1 font-bold">Управление магазином</h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Suspense fallback={null}>
              <SignedInAs />
            </Suspense>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center rounded-control border border-on-dark/40 px-4.5 text-[13px] font-semibold hover:border-on-dark"
            >
              Открыть магазин →
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center rounded-control border border-on-dark/40 px-4 text-[13px] font-semibold hover:border-on-dark"
              >
                Выйти
              </button>
            </form>
          </div>
        </div>

        <Suspense fallback={<StatsSkeleton />}>
          <Stats />
        </Suspense>
      </header>

      <div className="px-7 pt-4.5">
        <Suspense fallback={<TabList activeHref={null} badges={NO_BADGES} />}>
          <AdminTabs />
        </Suspense>
      </div>

      <main className="flex-1 px-7 pt-6 pb-13">{children}</main>
    </div>
  )
}

async function SignedInAs() {
  const session = await readAdminSession()
  if (!session) return null

  return <span className="text-[12.5px] text-on-dark/70">{session.email}</span>
}

async function Stats() {
  const stats = await getAdminStats()

  return (
    <dl className="mt-5.5 grid grid-cols-[repeat(auto-fit,minmax(min(160px,100%),1fr))] gap-px bg-on-dark/20">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-ink px-4 py-3.5">
          {/* Work that is waiting stands out; a plain figure stays quiet. */}
          <dd
            className={cn(
              'font-display text-[36px] leading-none font-bold',
              stat.isAttention && 'text-accent',
            )}
          >
            {stat.value}
          </dd>
          <dt
            className={cn(
              'mt-2 text-[12px]',
              stat.isAttention ? 'font-semibold text-on-dark' : 'text-on-dark/70',
            )}
          >
            {stat.label}
          </dt>
        </div>
      ))}
    </dl>
  )
}

function StatsSkeleton() {
  return (
    <div className="mt-5.5 grid grid-cols-[repeat(auto-fit,minmax(min(160px,100%),1fr))] gap-px bg-on-dark/20">
      {[0, 1, 2].map((slot) => (
        <div key={slot} className="bg-ink px-4 py-3.5">
          <div className="h-[36px] w-16 rounded-chip bg-on-dark/15" />
          <div className="mt-3 h-3 w-24 rounded-chip bg-on-dark/10" />
        </div>
      ))}
    </div>
  )
}
