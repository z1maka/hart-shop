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

const HEADING_CLASS = 'mb-2.5 text-small font-semibold text-ink'

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
    <aside className="flex w-full max-w-full flex-col gap-5.5">
      <section>
        <h2 className={HEADING_CLASS}>{t('category')}</h2>
        <div className="grid gap-0.5">
          {categories.map((category) => (
            <Link
              key={category.href}
              href={category.href}
              aria-current={category.isActive ? 'page' : undefined}
              className={cn(
                'flex min-h-[38px] items-center justify-between gap-3 border-l-[3px] px-3 py-1.5 text-small leading-snug text-ink transition-colors',
                category.isActive
                  ? 'border-accent bg-accent-soft font-semibold'
                  : 'border-transparent font-medium hover:bg-hover',
              )}
            >
              <span className="min-w-0">{category.label}</span>
              <span
                className={cn(
                  'shrink-0 text-caption tabular-nums',
                  category.isActive ? 'font-medium text-muted' : 'text-faint',
                )}
              >
                {category.count}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className={HEADING_CLASS}>{t('pattern')}</h2>
        <div className="flex flex-wrap gap-2">
          {/* Filter links open noindex lists crawlers are kept out of
              (config/catalog-filters.ts), so they pass nothing on. */}
          {colors.map((color) => (
            <Link
              key={color.href}
              href={color.href}
              rel="nofollow"
              aria-current={color.isActive ? 'true' : undefined}
              className={cn(
                'inline-flex min-h-9 items-center gap-2 rounded-chip px-3 text-meta text-ink transition-colors',
                color.isActive
                  ? 'border-[1.5px] border-accent bg-accent-soft font-semibold'
                  : 'border border-strong bg-raised font-medium hover:border-ink',
              )}
            >
              <ColorSwatch name={color.name} className="size-3 rounded-[2px]" />
              {colorsT.has(color.label) ? colorsT(color.label) : color.label}
            </Link>
          ))}
        </div>
      </section>

      {weightBands.length > 0 ? (
        <section>
          <h2 className={HEADING_CLASS}>{t('weight')}</h2>
          <div className="flex gap-1 rounded-control bg-sunken p-[3px]">
            {weightBands.map((band) => (
              <Link
                key={band.href}
                href={band.href}
                rel="nofollow"
                className={cn(
                  'flex min-h-[34px] flex-1 items-center justify-center rounded-chip px-1.5 text-center text-meta',
                  band.isActive ? 'bg-raised font-semibold text-ink' : 'font-medium text-muted',
                )}
              >
                {band.label}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {activeFilterCount > 0 ? (
        <Link href={clearHref} className="self-start text-meta font-semibold text-accent underline">
          {t('clear')}
        </Link>
      ) : null}
    </aside>
  )
}
