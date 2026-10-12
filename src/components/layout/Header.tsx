import Link from 'next/link'
import type { ReactNode } from 'react'
import { MobileNav, type NavLink } from '@/components/layout/MobileNav'
import { NavMenu, type NavMenuItem } from '@/components/layout/NavMenu'
import { Wordmark } from '@/components/layout/Wordmark'
import { CUSTOM_ORDER_HREF } from '@/config/custom-order'
import { NAV_GROUPS } from '@/config/navigation'
import { siteConfig } from '@/config/site'
import { cn } from '@/lib/utils'
import { getTranslations } from 'next-intl/server'

export type HeaderCategory = {
  readonly slug: string
  readonly name: string
}

export type HeaderProps = {
  readonly categories: readonly HeaderCategory[]
  readonly cartCount: number
  readonly search: ReactNode
}

// The pages that are not product categories. Each sits in the bar from the
// width where it fits beside the menus and lives in «Більше» below that, so
// it is reachable at every width and never shown twice. Measured: at 1280px
// the bar with the first two ran 36px past the edge; all four need ~1440px.
// A fifth link at 1440px pushed the cart 27px past the edge once the cart
// badge showed a count, so it joins the bar only from 1536px.
const PAGE_LINKS = [
  { key: 'delivery', href: '/delivery', inlineFrom: 'wide' },
  { key: 'refunds', href: '/refund-policy', inlineFrom: 'wide' },
  { key: 'aboutUs', href: '/about-us', inlineFrom: 'extraWide' },
  { key: 'contactUs', href: '/contact', inlineFrom: 'widest' },
  { key: 'guides', href: '/guides', inlineFrom: 'widest' },
] as const

// Spelled out in full because Tailwind only emits classes it can read.
const INLINE_FROM = {
  wide: { bar: 'hidden min-[1360px]:block', menu: 'min-[1360px]:hidden' },
  extraWide: { bar: 'hidden min-[1440px]:block', menu: 'min-[1440px]:hidden' },
  widest: { bar: 'hidden min-[1536px]:block', menu: 'min-[1536px]:hidden' },
} as const

const BAR_LINK_CLASS =
  'rounded-chip px-3 py-2.5 text-[13.5px] font-semibold whitespace-nowrap text-muted hover:bg-hover hover:text-ink'

const NAV_GROUP_KEYS: Record<string, string> = {
  Concealment: 'concealment',
  Equipment: 'equipment',
}

export async function Header({ categories, cartCount, search }: HeaderProps) {
  const t = await getTranslations('nav')

  // The same top-level pages the WordPress site links in its header.
  const pageLinks = PAGE_LINKS.map((entry) => ({
    label: t(entry.key),
    href: entry.href,
    inlineFrom: entry.inlineFrom,
  }))

  const groups = NAV_GROUPS.map((group) => ({
    label: t(NAV_GROUP_KEYS[group.label] ?? 'more'),
    items: group.categorySlugs
      .map((slug) => categories.find((category) => category.slug === slug))
      .filter((category): category is HeaderCategory => category !== undefined)
      .map((category) => ({ label: category.name, href: `/product-category/${category.slug}` })),
  })).filter((group) => group.items.length > 0)

  const groupedSlugs = new Set(NAV_GROUPS.flatMap((group) => group.categorySlugs))
  const ungrouped: NavMenuItem[] = categories
    .filter((category) => !groupedSlugs.has(category.slug))
    .map((category) => ({ label: category.name, href: `/product-category/${category.slug}` }))

  const moreMenu: readonly NavMenuItem[] = [
    ...ungrouped,
    ...pageLinks.map((link) => ({
      label: link.label,
      href: link.href,
      className: INLINE_FROM[link.inlineFrom].menu,
    })),
  ]
  // Once every page link is in the bar the menu would open empty, so it goes
  // with them; an ungrouped category keeps it.
  const moreTriggerClass = ungrouped.length === 0 ? INLINE_FROM.widest.menu : undefined

  // Second in the drawer, not last: a shopper who needs another size gives up
  // long before the end of the category list.
  const mobileLinks: NavLink[] = [
    { label: t('allProducts'), href: '/shop' },
    { label: t('customOrder'), href: CUSTOM_ORDER_HREF },
    ...groups.flatMap((group) => group.items),
    ...ungrouped,
    ...pageLinks.map((link) => ({ label: link.label, href: link.href })),
  ]

  return (
    <header className="sticky top-0 z-40 border-b border-subtle bg-canvas">
      <div className="flex flex-nowrap items-center gap-x-3 px-4 py-3 sm:px-7 sm:py-3.5">
        <Link href="/" aria-label={`${siteConfig.name} home`} className="shrink-0">
          <Wordmark height={30} isPriority />
        </Link>

        <nav className="ml-4 hidden items-center gap-x-1 lg:flex">
          <Link href="/shop" className={BAR_LINK_CLASS}>
            {t('allProducts')}
          </Link>
          {groups.map((group) => (
            <NavMenu key={group.label} label={group.label} items={group.items} />
          ))}
          {pageLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(BAR_LINK_CLASS, INLINE_FROM[link.inlineFrom].bar)}
            >
              {link.label}
            </Link>
          ))}
          <NavMenu label={t('more')} items={moreMenu} className={moreTriggerClass} />
        </nav>

        {/* Grouped by what things do, not by where they fit: the menus stay
            together on the left, and this stands with the search and the cart
            because it is an action too. Outlined rather than filled — the one
            filled thing in the bar is the cart. */}
        {/* ml-auto, not a fixed left margin: the actions belong on the right
            edge, opposite the logo, however much room the menus leave. */}
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2.5 lg:pl-6">
          <Link
            href={CUSTOM_ORDER_HREF}
            className="mr-1 hidden min-h-[42px] items-center gap-2 rounded-pill border-[1.5px] border-accent-edge bg-accent-tint px-4 text-[13px] font-semibold whitespace-nowrap text-accent-hover transition-colors hover:border-accent hover:bg-accent-soft hover:text-ink lg:inline-flex"
          >
            <ScissorsIcon />
            {t('customOrderShort')}
          </Link>
          {search}
          <Link
            href="/cart"
            aria-label={t('cart')}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-chip bg-ink px-3 text-[13px] font-semibold whitespace-nowrap text-on-dark hover:bg-ink-hover sm:px-4"
          >
            <CartIcon />
            <span className="hidden sm:inline">{t('cart')}</span>
            {cartCount > 0 ? (
              <span className="inline-block min-w-5 rounded-pill bg-accent px-1.5 py-0.5 text-center text-[11.5px] leading-[1.45] font-bold text-accent-fg">
                {cartCount}
              </span>
            ) : null}
          </Link>
          <MobileNav links={mobileLinks} />
        </div>
      </div>
    </header>
  )
}

// Sewing, in one glyph: the pill reads as an offer before the words do.
function ScissorsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="4" cy="12" r="2" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M5.4 10.6 12.5 2.5M10.6 10.6 3.5 2.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

function CartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3.5 5.5h9l-.7 7a1.3 1.3 0 0 1-1.3 1.2H5.5a1.3 1.3 0 0 1-1.3-1.2l-.7-7Z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path d="M5.7 5.3a2.3 2.3 0 0 1 4.6 0" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}
