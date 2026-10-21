import Image from 'next/image'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { COMPANY } from '@/config/company'
import { CUSTOM_ORDER_HREF } from '@/config/custom-order'
import { PARTNERS_HREF } from '@/config/partners'

export type FooterProps = {
  readonly categories: readonly { readonly slug: string; readonly name: string }[]
}

// The pages a shopper looks for, in the Гарт design's order. The guides stay
// although the design left them out: this column is their one link from every
// page. The page for other makers, the offer, the privacy policy and the
// seller's details sit in the bottom row.
const CUSTOMER_LINK_KEYS = [
  { key: 'delivery', href: '/delivery/' },
  { key: 'refunds', href: '/refund-policy/' },
  { key: 'customOrder', href: CUSTOM_ORDER_HREF },
  { key: 'aboutUs', href: '/about-us/' },
  { key: 'guides', href: '/guides/' },
  { key: 'contactUs', href: '/contact/' },
] as const

const FULL_LOGO = { src: '/logo/hart-full.png', width: 220, height: 210 } as const

export async function Footer({ categories }: FooterProps) {
  const t = await getTranslations('footer')

  return (
    <footer className="bg-footer text-on-dark">
      <div className="grid gap-8 px-7 pt-12 pb-8 sm:grid-cols-2 lg:grid-cols-4">
        <div className="min-w-0 sm:col-span-2">
          <Image
            src={FULL_LOGO.src}
            alt={t('logoAlt')}
            width={FULL_LOGO.width}
            height={FULL_LOGO.height}
            className="mb-4.5 block h-auto w-[220px]"
          />
          <p className="max-w-[44ch] text-[13px] leading-relaxed text-on-dark-muted">
            {t('description')}
          </p>
        </div>

        <FooterColumn title={t('shop')}>
          {categories.map((category) => (
            <FooterLink key={category.slug} href={`/product-category/${category.slug}/`}>
              {category.name}
            </FooterLink>
          ))}
        </FooterColumn>

        <FooterColumn title={t('customers')}>
          {CUSTOMER_LINK_KEYS.map((link) => (
            <FooterLink key={link.href} href={link.href}>
              {t(link.key)}
            </FooterLink>
          ))}
        </FooterColumn>
      </div>

      {/* The seller is named on every page: consumer law and the acquirer's
          moderation both expect it, and buyers check it before paying. */}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2.5 border-t border-dark-line px-7 py-4 text-[12px] leading-relaxed text-on-dark-muted">
        <div className="flex flex-col gap-0.5">
          <span>{t('madeBy')}</span>
          <span>
            {COMPANY.legalName} · {t('taxIdLabel')} {COMPANY.taxId} ·{' '}
            <a href={COMPANY.phoneHref} className="hover:text-on-dark">
              {COMPANY.phone}
            </a>{' '}
            ·{' '}
            <a href={`mailto:${COMPANY.email}`} className="hover:text-on-dark">
              {COMPANY.email}
            </a>
          </span>
        </div>
        <nav className="flex flex-wrap gap-x-4 gap-y-1">
          <Link href={PARTNERS_HREF} className="hover:text-on-dark">
            {t('partners')}
          </Link>
          <Link href="/publichna-oferta/" className="hover:text-on-dark">
            {t('offer')}
          </Link>
          <Link href="/privacy-policy/" className="hover:text-on-dark">
            {t('privacy')}
          </Link>
          <Link href="/about-us/#seller" className="hover:text-on-dark">
            {t('imprint')}
          </Link>
        </nav>
      </div>
    </footer>
  )
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3.5 font-display text-[13px] font-semibold tracking-[0.12em] text-footer-label">
        {title}
      </div>
      <div className="grid justify-items-start gap-2.5">{children}</div>
    </div>
  )
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-[13.5px] text-on-dark-link transition-colors hover:text-khaki">
      {children}
    </Link>
  )
}
