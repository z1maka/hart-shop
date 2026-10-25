import Link from 'next/link'
import type { TabBadges } from '@/features/admin/queries/get-admin-stats'
import { cn } from '@/lib/utils'

// Rendered on both sides: the client highlight wraps it, and the server
// fallback shows it before the path is known. Nothing here may import
// server-only code at runtime; the badges type is erased at compile time.

export const ADMIN_TABS = [
  { href: '/admin/catalog', label: 'Каталог' },
  { href: '/admin/orders', label: 'Заказы' },
  { href: '/admin/enquiries', label: 'Заявки' },
  { href: '/admin/reviews', label: 'Отзывы' },
  { href: '/admin/storefront', label: 'Витрина' },
  { href: '/admin/stats', label: 'Статистика' },
  { href: '/admin/settings', label: 'Настройки' },
] as const

export const NO_BADGES: TabBadges = {}

const PHONE_COLUMNS = 3
const HAS_LONE_LAST_TAB = ADMIN_TABS.length % PHONE_COLUMNS === 1

export function TabList({ activeHref, badges }: { activeHref: string | null; badges: TabBadges }) {
  return (
    // Three even columns on a phone, a lone last tab across its row: wrapped
    // pills leave a ragged edge.
    <div className="grid grid-cols-3 gap-1 rounded-[10px] bg-hover p-1 sm:flex sm:max-w-fit sm:flex-wrap">
      {ADMIN_TABS.map((tab, index) => {
        const isActive = activeHref === tab.href || activeHref?.startsWith(`${tab.href}/`)
        const waiting = badges[tab.href]

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'inline-flex min-h-10.5 items-center justify-center gap-2 rounded-chip px-2 text-[12.5px] font-semibold transition-colors sm:justify-start sm:px-4',
              isActive ? 'bg-ink text-on-dark' : 'text-ink hover:bg-surface',
              HAS_LONE_LAST_TAB && index === ADMIN_TABS.length - 1 && 'col-span-3',
            )}
          >
            {tab.label}
            {waiting ? (
              <span
                aria-label={`${waiting} ждут обработки`}
                className="inline-flex min-w-5.5 items-center justify-center rounded-pill bg-accent px-1.5 py-0.5 text-[11px] font-bold text-ink"
              >
                {waiting}
              </span>
            ) : null}
          </Link>
        )
      })}
    </div>
  )
}
