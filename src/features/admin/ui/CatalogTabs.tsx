import Link from 'next/link'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export const CatalogTab = {
  Products: 'products',
  Categories: 'categories',
} as const

export type CatalogTab = (typeof CatalogTab)[keyof typeof CatalogTab]

type CatalogTabsProps = {
  readonly active: CatalogTab
  readonly productCount: number
  readonly categoryCount: number
  // The buttons on the right belong to the open tab.
  readonly actions: ReactNode
}

// Products and categories are two lists of their own, so neither pushes the
// other down the page.
export function CatalogTabs({ active, productCount, categoryCount, actions }: CatalogTabsProps) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-subtle">
      <nav className="flex gap-6" aria-label="Каталог">
        <TabLink
          href="/admin/catalog"
          isActive={active === CatalogTab.Products}
          label="Товары"
          count={productCount}
        />
        <TabLink
          href="/admin/catalog/categories"
          isActive={active === CatalogTab.Categories}
          label="Категории"
          count={categoryCount}
        />
      </nav>
      <div className="mb-2.5 flex flex-wrap items-center gap-2.5">{actions}</div>
    </div>
  )
}

export function TabLink({
  href,
  isActive,
  label,
  count,
}: {
  readonly href: string
  readonly isActive: boolean
  readonly label: string
  readonly count: number
}) {
  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        '-mb-px border-b-2 pb-3 text-[14.5px] font-semibold transition-colors',
        isActive ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink',
      )}
    >
      {label} <span className="font-normal text-muted">{count}</span>
    </Link>
  )
}
