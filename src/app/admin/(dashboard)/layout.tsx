import { Suspense } from 'react'
import Link from 'next/link'
import { getAdminStats, readAdminSession, signOutAction } from '@/features/admin'
import { NO_BADGES, TabList } from '@/features/admin/ui/AdminTabList'
import { AdminTabs } from '@/features/admin/ui/AdminTabs'
import { cn } from '@/lib/utils'

// Two to a row on a phone, so the figures share the first screen with the
// tabs instead of filling it.
const STATS_GRID_CLASS =
  'mt-4 grid grid-cols-2 gap-px bg-on-dark/20 sm:mt-5.5 sm:grid-cols-[repeat(auto-fit,minmax(160px,1fr))]'
const STAT_CELL_CLASS = 'bg-ink px-3.5 py-3 sm:px-4 sm:py-3.5'

export default function AdminDashboardLayout({ children }: LayoutProps<'/admin'>) {
  return (
    <div className="flex min-h-full flex-col bg-canvas">
      <header className="bg-ink px-4 py-5 text-on-dark sm:px-7 sm:py-6">
        <div className="flex flex-wrap items-end justify-between gap-3.5">
          <div>
            <p className="mb-2.5 text-[12px] font-semibold text-footer-label">
              Внутренний доступ · только для персонала
            </p>
            <h1 className="font-display text-[26px] leading-none font-bold sm:text-h1">
              Управление магазином
            </h1>
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

      <div className="px-4 pt-4 sm:px-7 sm:pt-4.5">
        <Suspense fallback={<TabList activeHref={null} badges={NO_BADGES} />}>
          <AdminTabs />
        </Suspense>
      </div>

      <main className="flex-1 px-4 pt-5 pb-10 sm:px-7 sm:pt-6 sm:pb-13">{children}</main>
    </div>
  )
}

async function SignedInAs() {
  const session = await readAdminSession()
  if (!session) return null

  // On a phone the address would push «Выйти» onto a line of its own.
  return <span className="hidden text-[12.5px] text-on-dark/70 sm:inline">{session.email}</span>
}

async function Stats() {
  const stats = await getAdminStats()

  return (
    <dl className={STATS_GRID_CLASS}>
      {stats.map((stat) => (
        <div key={stat.label} className={STAT_CELL_CLASS}>
          {/* Work that is waiting stands out; a plain figure stays quiet. */}
          <dd
            className={cn(
              'font-display text-[28px] leading-none font-bold sm:text-[36px]',
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
    <div className={STATS_GRID_CLASS}>
      {[0, 1, 2].map((slot) => (
        <div key={slot} className={STAT_CELL_CLASS}>
          <div className="h-[28px] w-16 rounded-chip bg-on-dark/15 sm:h-[36px]" />
          <div className="mt-3 h-3 w-24 rounded-chip bg-on-dark/10" />
        </div>
      ))}
    </div>
  )
}
