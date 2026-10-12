import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Wordmark } from '@/components/layout/Wordmark'
import { COMPANY } from '@/config/company'
import { CUSTOM_ORDER_HREF } from '@/config/custom-order'

export type FooterProps = {
  readonly categories: readonly { readonly slug: string; readonly name: string }[]
}

// Mirrors the WordPress footer: delivery and refunds next to the category
// links, plus the pages a shopper actually looks for.
const CUSTOMER_LINK_KEYS = [
  { key: 'delivery', href: '/delivery' },
  { key: 'refunds', href: '/refund-policy' },
  { key: 'aboutUs', href: '/about-us' },
  { key: 'guides', href: '/guides' },
  { key: 'customOrder', href: CUSTOM_ORDER_HREF },
  { key: 'contactUs', href: '/contact' },
  { key: 'privacy', href: '/privacy-policy' },
] as const

export async function Footer({ categories }: FooterProps) {
  const t = await getTranslations('footer')

  return (
    <footer className="bg-footer text-on-dark">
      <div className="grid gap-7 px-7 pt-10 pb-7 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <Wordmark tone="light" height={44} className="mb-4" />
          <p className="max-w-[36ch] text-[13px] leading-relaxed text-on-dark/60">
            {t('description')}
          </p>
        </div>

        <FooterColumn title={t('shop')}>
          {categories.map((category) => (
            <FooterLink key={category.slug} href={`/product-category/${category.slug}`}>
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
      <div className="flex flex-col gap-1 border-t border-on-dark/15 px-7 py-4 text-[12px] leading-relaxed text-on-dark/70">
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
    </footer>
  )
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 text-[12px] font-semibold tracking-[0.05em] text-footer-label uppercase">
        {title}
      </div>
      <div className="grid justify-items-start gap-2">{children}</div>
    </div>
  )
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-[13.5px] text-on-dark/75 hover:text-white">
      {children}
    </Link>
  )
}
