import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { getTranslations } from 'next-intl/server'
import { COMPANY } from '@/config/company'
import { CUSTOM_ORDER_HREF } from '@/config/custom-order'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta')

  return {
    title: t('offer.title'),
    description: t('offer.description'),
    alternates: { canonical: '/publichna-oferta/' },
  }
}

const SELLER_ROWS = [
  { key: 'name', value: COMPANY.legalName, href: null },
  { key: 'taxId', value: COMPANY.taxId, href: null },
  { key: 'phone', value: COMPANY.phone, href: COMPANY.phoneHref },
  { key: 'email', value: COMPANY.email, href: `mailto:${COMPANY.email}` },
  { key: 'site', value: COMPANY.site, href: null },
] as const

// The offer restates only what the shop has already settled on its own pages
// and links there for the detail, so return terms, tariffs and data handling
// each live in one place and cannot drift apart from the contract.
const SECTIONS = [
  { key: 'general', clauses: ['offer', 'law', 'form'] },
  { key: 'subject', clauses: ['transfer', 'description', 'custom'] },
  { key: 'ordering', clauses: ['accept', 'details', 'confirm'] },
  { key: 'price', clauses: ['currency', 'fixed', 'shipping'] },
  { key: 'payment', clauses: ['choice', 'cod', 'card', 'transfer'] },
  { key: 'delivery', clauses: ['carrier', 'dispatch', 'details'] },
  { key: 'returns', clauses: ['returns', 'warranty'] },
  { key: 'data', clauses: ['processing'] },
  { key: 'disputes', clauses: ['talk', 'law'] },
  { key: 'changes', clauses: ['edition'] },
] as const

const CLAUSE_VALUES = {
  seller: COMPANY.legalName,
  site: COMPANY.site,
  email: COMPANY.email,
  phone: COMPANY.phone,
  customOrder: (chunks: ReactNode) => <InlineLink href={CUSTOM_ORDER_HREF}>{chunks}</InlineLink>,
  delivery: (chunks: ReactNode) => <InlineLink href="/delivery/">{chunks}</InlineLink>,
  refunds: (chunks: ReactNode) => <InlineLink href="/refund-policy/">{chunks}</InlineLink>,
  privacy: (chunks: ReactNode) => <InlineLink href="/privacy-policy/">{chunks}</InlineLink>,
}

type PageTranslator = Awaited<ReturnType<typeof getTranslations<'offerPage'>>>

export default async function PublicOfferPage() {
  const t = await getTranslations('offerPage')

  return (
    <div className="mx-auto max-w-4xl px-7 py-10">
      <p className="mb-3 text-[12.5px] font-semibold text-accent">{t('kicker')}</p>
      <h1 className="mb-3 font-display text-h1 font-bold text-ink">{t('title')}</h1>
      <p className="mb-2 max-w-[68ch] text-[14.5px] leading-relaxed text-muted">
        {t('lead', { brand: COMPANY.tradingName, site: COMPANY.site })}
      </p>
      <p className="mb-8 text-[12.5px] text-faint">{t('updated')}</p>

      <SellerCard t={t} />

      {SECTIONS.map((section, index) => (
        <ContractSection
          key={section.key}
          number={index + 1}
          title={t(`sections.${section.key}.title`)}
          clauses={section.clauses.map((clause) => ({
            key: clause,
            text: t.rich(`sections.${section.key}.clauses.${clause}`, CLAUSE_VALUES),
          }))}
        />
      ))}
    </div>
  )
}

// The seller's identity first: buyers open this page to check who they are
// paying before anything else.
function SellerCard({ t }: { readonly t: PageTranslator }) {
  return (
    <section className="mb-10 rounded-card border border-subtle bg-surface p-6">
      <h2 className="mb-3.5 font-display text-[20px] font-bold tracking-[0.04em] text-ink">
        {t('seller.title')}
      </h2>
      <dl className="grid gap-3 text-[13.5px] sm:grid-cols-[max-content_1fr] sm:gap-x-6 sm:gap-y-2">
        {SELLER_ROWS.map((row) => (
          <div key={row.key} className="grid gap-0.5 sm:contents">
            <dt className="text-muted">{t(`seller.${row.key}`)}</dt>
            <dd className="font-semibold break-words text-ink">
              {row.href ? (
                <a href={row.href} className="text-accent hover:underline">
                  {row.value}
                </a>
              ) : (
                row.value
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

type Clause = { readonly key: string; readonly text: ReactNode }

function ContractSection({
  number,
  title,
  clauses,
}: {
  readonly number: number
  readonly title: string
  readonly clauses: readonly Clause[]
}) {
  return (
    <section className="mb-9 grid gap-4">
      <h2 className="font-display text-h3 font-bold text-ink">
        {number}. {title}
      </h2>
      <ol className="grid max-w-[72ch] gap-3">
        {clauses.map((clause, index) => (
          <li key={clause.key} className="flex gap-3 text-[14.5px] leading-relaxed text-muted">
            <span className="min-w-[2.25em] shrink-0 font-semibold text-ink tabular-nums">
              {number}.{index + 1}
            </span>
            <span>{clause.text}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

function InlineLink({ href, children }: { readonly href: string; readonly children: ReactNode }) {
  return (
    <Link href={href} className="font-semibold text-accent underline underline-offset-4">
      {children}
    </Link>
  )
}
