import Link from 'next/link'
import { cn } from '@/lib/utils'

// Only what exists: a settings menu that lists pages the shop does not have
// teaches the owner to ignore it.
const SETTINGS_PAGES = [
  { href: '/admin/settings/nova-post', label: 'Новая Почта' },
  { href: '/admin/settings/requisites', label: 'Реквизиты' },
] as const

export type SettingsPage = (typeof SETTINGS_PAGES)[number]['href']

export function SettingsNav({ current }: { readonly current: SettingsPage }) {
  return (
    <nav className="min-w-[min(100%,200px)] flex-[1_1_200px]">
      <ul className="grid gap-1">
        {SETTINGS_PAGES.map((page) => (
          <li key={page.href}>
            <Link
              href={page.href}
              aria-current={page.href === current ? 'page' : undefined}
              className={cn(
                'inline-flex min-h-10.5 w-full items-center rounded-[10px] px-3.5 text-[12.5px] font-semibold',
                page.href === current
                  ? 'bg-hover text-ink'
                  : 'text-muted hover:bg-hover hover:text-ink',
              )}
            >
              {page.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
