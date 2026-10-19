import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { getTranslations } from 'next-intl/server'
import { COMPANY } from '@/config/company'
import { ConsentSettings } from '@/features/analytics'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta')

  return {
    title: t('privacyPolicy.title'),
    description: t('privacyPolicy.description'),
    alternates: { canonical: '/privacy-policy/' },
  }
}

const COLLECTED_KEYS = ['order', 'quick', 'enquiry', 'payment', 'technical'] as const
const PURPOSE_KEYS = ['fulfil', 'contact', 'returns', 'accounting', 'marketing'] as const
const RECIPIENT_KEYS = [
  'carrier',
  'payments',
  'sms',
  'mail',
  'hosting',
  'staff',
  'ads',
  'reviews',
] as const
const COOKIE_KEYS = [
  'cart',
  'consent',
  'trafficSource',
  'analytics',
  'googleAds',
  'metaPixel',
  'googleReviews',
] as const
const RIGHT_KEYS = ['know', 'access', 'correct', 'withdraw', 'complain'] as const

const GOOGLE_PRIVACY_URL = 'https://policies.google.com/privacy'
const META_PRIVACY_URL = 'https://www.facebook.com/privacy/policy/'

type PageTranslator = Awaited<ReturnType<typeof getTranslations<'privacyPage'>>>

// What the shop actually does with a buyer's data, written from the code:
// the fields checkout asks for, the services an order passes through, and the
// cookies the site sets — the ones for ads only after the buyer agrees.
export default async function PrivacyPolicyPage() {
  const t = await getTranslations('privacyPage')

  return (
    <div className="mx-auto max-w-4xl px-7 py-10">
      <p className="mb-3 text-[12.5px] font-semibold text-accent">{t('kicker')}</p>
      <h1 className="mb-3 font-display text-h1 font-bold text-ink">{t('title')}</h1>
      <p className="mb-2 max-w-[68ch] text-[14.5px] leading-relaxed text-muted">{t('lead')}</p>
      <p className="mb-10 text-[12.5px] text-faint">{t('updated')}</p>

      <Section title={t('controller.title')}>
        <Paragraph>
          {t('controller.body', {
            name: COMPANY.legalName,
            taxId: COMPANY.taxId,
            email: COMPANY.email,
            phone: COMPANY.phone,
          })}
        </Paragraph>
      </Section>

      <Section title={t('collected.title')}>
        <Items items={COLLECTED_KEYS.map((key) => t(`collected.items.${key}`))} />
      </Section>

      <Section title={t('purposes.title')}>
        <Items items={PURPOSE_KEYS.map((key) => t(`purposes.items.${key}`))} />
      </Section>

      <Section title={t('recipients.title')}>
        <Items items={RECIPIENT_KEYS.map((key) => t(`recipients.items.${key}`))} />
        <Paragraph>{t('recipients.note')}</Paragraph>
      </Section>

      <Section title={t('cookies.title')} id="cookies">
        <Paragraph>{t('cookies.lead')}</Paragraph>
        <CookieTable t={t} />
        <Paragraph>
          {t('cookies.third')}{' '}
          <ExternalLink href={GOOGLE_PRIVACY_URL}>{t('cookies.googlePolicy')}</ExternalLink>,{' '}
          <ExternalLink href={META_PRIVACY_URL}>{t('cookies.metaPolicy')}</ExternalLink>.
        </Paragraph>
        <ConsentSettings />
      </Section>

      <Section title={t('retention.title')}>
        <Paragraph>{t('retention.body')}</Paragraph>
      </Section>

      <Section title={t('rights.title')}>
        <Paragraph>{t('rights.lead')}</Paragraph>
        <Items items={RIGHT_KEYS.map((key) => t(`rights.items.${key}`))} />
        <Paragraph>{t('rights.how', { email: COMPANY.email })}</Paragraph>
      </Section>

      <Section title={t('security.title')}>
        <Paragraph>{t('security.body')}</Paragraph>
      </Section>

      <Section title={t('changes.title')}>
        <Paragraph>{t('changes.body')}</Paragraph>
      </Section>
    </div>
  )
}

// A table on wide screens, one card per cookie on a phone: four columns do
// not fit 375 pixels without scrolling the page sideways.
function CookieTable({ t }: { readonly t: PageTranslator }) {
  const headings = ['name', 'purpose', 'term', 'kind'] as const

  return (
    <div className="overflow-hidden rounded-card border border-subtle bg-surface">
      <div className="hidden grid-cols-[1.1fr_2.4fr_0.8fr_1fr] gap-4 border-b border-subtle bg-sunken px-5 py-3 text-[11.5px] font-semibold tracking-[0.03em] text-faint uppercase sm:grid">
        {headings.map((heading) => (
          <span key={heading}>{t(`cookies.${heading}`)}</span>
        ))}
      </div>
      <ul>
        {COOKIE_KEYS.map((key) => (
          <li
            key={key}
            className="grid gap-1.5 border-subtle px-5 py-4 text-[13.5px] not-first:border-t sm:grid-cols-[1.1fr_2.4fr_0.8fr_1fr] sm:gap-4"
          >
            <span className="font-mono text-[12.5px] font-semibold break-words text-ink">
              {t(`cookies.rows.${key}.name`)}
            </span>
            <span className="leading-relaxed text-muted">{t(`cookies.rows.${key}.purpose`)}</span>
            <span className="text-ink">{t(`cookies.rows.${key}.term`)}</span>
            <span className="text-ink">{t(`cookies.rows.${key}.kind`)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Section({
  title,
  id,
  children,
}: {
  readonly title: string
  readonly id?: string
  readonly children: ReactNode
}) {
  return (
    <section id={id} className="mb-9 grid scroll-mt-24 gap-4">
      <h2 className="font-display text-h3 font-bold text-ink">{title}</h2>
      {children}
    </section>
  )
}

function Paragraph({ children }: { readonly children: ReactNode }) {
  return <p className="max-w-[72ch] text-[14.5px] leading-relaxed text-muted">{children}</p>
}

function Items({ items }: { readonly items: readonly string[] }) {
  return (
    <ul className="grid max-w-[72ch] gap-2.5">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-[14.5px] leading-relaxed text-muted">
          <span aria-hidden className="mt-[9px] size-1.5 shrink-0 rounded-full bg-accent" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function ExternalLink({ href, children }: { readonly href: string; readonly children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-semibold text-accent underline underline-offset-4"
    >
      {children}
    </a>
  )
}
