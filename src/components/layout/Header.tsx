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

// The pages that are not product categories, as the Гарт design lists them.
// Each sits in the bar from the width where it fits beside the menus and lives
// in «Більше» below that, so it is reachable at every width and never shown
// twice. Measured with the 171px lockup and a count on the cart: delivery
// fits from ~1150px, about from ~1235px, and contacts takes the place of
// «Більше» right after; each threshold keeps ~20px spare for a longer count.
const PAGE_LINKS = [
  { key: 'delivery', href: '/delivery', inlineFrom: 'wide' },
  { key: 'aboutUs', href: '/about-us', inlineFrom: 'extraWide' },
  { key: 'contactUs', href: '/contact', inlineFrom: 'widest' },
] as const

// Spelled out in full because Tailwind only emits classes it can read.
const INLINE_FROM = {
  wide: { bar: 'hidden min-[1160px]:inline-flex', menu: 'min-[1160px]:hidden' },
  extraWide: { bar: 'hidden min-[1240px]:inline-flex', menu: 'min-[1240px]:hidden' },
  widest: { bar: 'hidden min-[1260px]:inline-flex', menu: 'min-[1260px]:hidden' },
} as const

// Not in the bar at any width, but a phone has nothing else: the drawer lists
// them after the bar's own pages.
const DRAWER_ONLY_LINKS = [
  { key: 'refunds', href: '/refund-policy' },
  { key: 'guides', href: '/guides' },
] as const

const BAR_LINK_CLASS =
  'inline-flex min-h-10 items-center rounded-control px-3 font-display text-[14px] font-medium tracking-[0.06em] whitespace-nowrap text-on-dark transition-colors hover:bg-dark-hover hover:text-khaki'

// The bar's height at each width: the tallest control (the 44px menu button
// below lg, the 42px cart above) plus its padding. Fixed, so the placeholder
// shown while the header streams in takes exactly the same room.
const HEADER_ROW_HEIGHT = 'h-17 sm:h-18 lg:h-17.5'

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
    ...DRAWER_ONLY_LINKS.map((link) => ({ label: t(link.key), href: link.href })),
  ]

  return (
    <header className="sticky top-0 z-40 border-b-[3px] border-header-line bg-header">
      <div className={cn('flex flex-nowrap items-center gap-x-3 px-4 sm:px-7', HEADER_ROW_HEIGHT)}>
        <Link href="/" aria-label={`${siteConfig.name} home`} className="shrink-0">
          <Wordmark isEager />
        </Link>

        <nav className="ml-3 hidden items-center gap-x-0.5 lg:flex">
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

        {/* ml-auto, not a fixed left margin: the actions belong on the right
            edge, opposite the logo, however much room the menus leave. The
            cart is the one filled thing in the bar, in khaki. */}
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2.5 lg:pl-4">
          {search}
          <Link
            href="/cart"
            aria-label={t('cart')}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-control bg-khaki px-3 text-[13px] font-extrabold whitespace-nowrap text-ink transition-colors hover:bg-khaki-hover sm:px-4"
          >
            <CartIcon />
            <span className="hidden sm:inline">{t('cart')}</span>
            {cartCount > 0 ? (
              <span className="inline-block min-w-5 rounded-pill bg-ink px-1.5 py-0.5 text-center text-[11px] leading-[1.45] font-extrabold text-khaki">
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

export function HeaderPlaceholder() {
  return (
    <div className="border-b-[3px] border-header-line bg-header">
      <div className={HEADER_ROW_HEIGHT} />
    </div>
  )
}

function CartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3.5 5.5h9l-.7 7a1.3 1.3 0 0 1-1.3 1.2H5.5a1.3 1.3 0 0 1-1.3-1.2l-.7-7Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M5.7 5.3a2.3 2.3 0 0 1 4.6 0" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}
