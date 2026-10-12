import Link from 'next/link'
import { ColorSwatch } from '@/components/ui/ColorSwatch'
import { cn } from '@/lib/utils'
import { getTranslations } from 'next-intl/server'

export type FilterOption = {
  readonly label: string
  readonly href: string
  readonly isActive: boolean
}

export type CategoryFilterOption = FilterOption & {
  readonly count: number
}

export type ColorFilterOption = FilterOption & {
  readonly name: string
}

type CatalogSidebarProps = {
  readonly categories: readonly CategoryFilterOption[]
  readonly colors: readonly ColorFilterOption[]
  readonly weightBands: readonly FilterOption[]
  readonly clearHref: string
  readonly activeFilterCount: number
}


export async function CatalogSidebar({
  categories,
  colors,
  weightBands,
  clearHref,
  activeFilterCount,
}: CatalogSidebarProps) {
  const t = await getTranslations('filters')
  const colorsT = await getTranslations('colors')
  return (
    <aside className="w-full max-w-full rounded-card border border-subtle bg-surface p-5">
      <div className="flex items-baseline justify-between border-b border-subtle pb-3.5">
        <span className="text-[14px] font-semibold text-ink">
          {t('title')} · {activeFilterCount}
        </span>
        {activeFilterCount > 0 ? (
          <Link
            href={clearHref}
            className="text-[12.5px] font-semibold text-accent-hover hover:underline"
          >
            {t('clear')}
          </Link>
        ) : null}
      </div>

      <section className="border-b border-subtle py-4">
        <h2 className="mb-2.5 text-[12px] font-semibold tracking-[0.05em] text-faint uppercase">
          {t('category')}
        </h2>
        <div className="grid gap-0.5">
          {categories.map((category) => (
            <Link
              key={category.href}
              href={category.href}
              aria-current={category.isActive ? 'page' : undefined}
              className="flex min-h-9 items-center gap-2.5 rounded-chip px-1.5 py-1.5 text-[13px] leading-snug font-medium text-ink hover:bg-hover"
            >
              <span
                className={cn(
                  'size-3.5 shrink-0 rounded-[4px] border-[1.5px] border-faint',
                  category.isActive ? 'bg-accent' : 'bg-raised',
                )}
                aria-hidden
              />
              <span className="min-w-0 flex-1">{category.label}</span>
              <span className="shrink-0 text-[12px] text-faint tabular-nums">{category.count}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-b border-subtle py-4">
        <h2 className="mb-3 text-[12px] font-semibold tracking-[0.05em] text-faint uppercase">
          {t('pattern')}
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {colors.map((color) => (
            <Link
              key={color.href}
              href={color.href}
              className={cn(
                'inline-flex min-h-8 items-center gap-1.5 rounded-pill border px-3 text-[12px] font-medium text-ink transition-colors hover:border-accent',
                color.isActive ? 'border-accent bg-accent-soft' : 'border-subtle bg-raised',
              )}
            >
              <ColorSwatch name={color.name} className="size-3" />
              {colorsT.has(color.label) ? colorsT(color.label) : color.label}
            </Link>
          ))}
        </div>
      </section>

      {weightBands.length > 0 ? (
        <section className="border-b border-subtle py-4">
          <h2 className="mb-3 text-[12px] font-semibold tracking-[0.05em] text-faint uppercase">
            {t('weight')}
          </h2>
          <div className="flex gap-0.5 rounded-control bg-hover p-0.5">
            {weightBands.map((band) => (
              <Link
                key={band.href}
                href={band.href}
                className={cn(
                  'flex min-h-9.5 flex-1 items-center justify-center rounded-chip px-1.5 text-center text-[12.5px] font-semibold text-ink',
                  band.isActive && 'bg-surface shadow-tab',
                )}
              >
                {band.label}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </aside>
  )
}
