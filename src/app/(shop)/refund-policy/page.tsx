import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { getTranslations } from 'next-intl/server'
import { Button } from '@/components/ui/Button'
import { COMPANY, RETURNS_POINT } from '@/config/company'
import { HEADER_CHANNELS } from '@/config/contact'
import { CUSTOM_ORDER_HREF } from '@/config/custom-order'
import { cn } from '@/lib/utils'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta')

  return {
    title: t('refundPolicy.title'),
    description: t('refundPolicy.description'),
    alternates: {
      // Canonical mirrors the indexed WordPress URL, trailing slash included.
      canonical: '/refund-policy/',
    },
  }
}

const FACT_KEYS = ['days', 'money', 'defect', 'custom'] as const
const CONDITION_KEYS = ['unused', 'complete', 'labels', 'look'] as const
const FIT_STEP_KEYS = ['contact', 'send', 'waybill', 'refund'] as const
const DEFECT_STEP_KEYS = ['contact', 'send', 'refund'] as const
const SHIPPING_KEYS = ['fit', 'defect'] as const
const ADDRESS_ROWS = [
  { key: 'carrier', value: `${RETURNS_POINT.carrier}, ${RETURNS_POINT.city}` },
  { key: 'branch', value: `${RETURNS_POINT.branch} · ${RETURNS_POINT.street}` },
  { key: 'recipient', value: COMPANY.legalName },
  { key: 'phone', value: COMPANY.phone },
] as const
const MONEY_KEYS = ['card', 'cod', 'term'] as const
const EXCLUSION_KEYS = ['custom', 'used', 'list'] as const

const TELEGRAM_HREF = HEADER_CHANNELS.find((channel) => channel.key === 'telegram')?.href ?? null

// The two cases are told apart the way the law tells them apart: a thing
// that simply did not suit, and a thing that is faulty. Each carries its own
// conditions, steps and bill for the delivery, so a buyer reads only the
// half that concerns them.
export default async function RefundPolicyPage() {
  const t = await getTranslations('refundPolicyPage')

  return (
    <div className="mx-auto max-w-5xl px-7 py-10">
      <p className="mb-3 text-[12.5px] font-semibold text-accent-hover">{t('kicker')}</p>
      <h1 className="mb-3 font-display text-h1 font-bold text-ink">{t('title')}</h1>
      <p className="mb-8 max-w-[68ch] text-[14.5px] leading-relaxed text-muted">{t('lead')}</p>

      <ul className="mb-11 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {FACT_KEYS.map((key) => (
          <li key={key} className="rounded-card border border-subtle bg-surface p-5">
            <p className="mb-1 font-display text-[22px] leading-tight font-bold text-ink">
              {t(`facts.${key}.value`)}
            </p>
            <p className="text-[12.5px] leading-relaxed text-muted">{t(`facts.${key}.caption`)}</p>
          </li>
        ))}
      </ul>

      <Section title={t('termsTitle')}>
        <p className="max-w-[76ch] text-[14px] leading-relaxed text-pretty text-muted">
          {t('termsBody')}
        </p>
      </Section>

      <Section title={t('casesTitle')}>
        <div className="grid gap-5 md:grid-cols-2">
          <CaseCard
            badge={t('fit.badge')}
            badgeClass="bg-accent-soft text-accent-hover"
            title={t('fit.title')}
            lead={t('fit.lead')}
          >
            <ul className="mb-5 grid gap-2">
              {CONDITION_KEYS.map((key) => (
                <li key={key} className="flex gap-2.5 text-[13px] leading-relaxed text-muted">
                  <CheckMark />
                  {t(`fit.conditions.${key}`)}
                </li>
              ))}
            </ul>
            <Steps
              title={t('stepsTitle')}
              steps={FIT_STEP_KEYS.map((key) => t(`fit.steps.${key}`))}
            />
          </CaseCard>

          <CaseCard
            badge={t('defect.badge')}
            badgeClass="bg-alert-soft text-alert"
            title={t('defect.title')}
            lead={t('defect.lead')}
          >
            <p className="mb-5 text-[13px] leading-relaxed text-muted">{t('defect.rights')}</p>
            <Steps
              title={t('stepsTitle')}
              steps={DEFECT_STEP_KEYS.map((key) => t(`defect.steps.${key}`))}
            />
          </CaseCard>
        </div>
      </Section>

      <Section title={t('shippingTitle')}>
        <div className="overflow-hidden rounded-card border border-subtle bg-surface">
          {SHIPPING_KEYS.map((key, index) => (
            <div
              key={key}
              className={cn(
                'flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-5 py-4',
                index > 0 && 'border-t border-subtle',
              )}
            >
              <p className="text-[13.5px] font-semibold text-ink">{t(`shipping.${key}.case`)}</p>
              <p className="text-[13.5px] text-muted">{t(`shipping.${key}.who`)}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title={t('addressTitle')}>
        <div className="rounded-card border border-subtle bg-surface p-6">
          <dl className="grid gap-3 sm:grid-cols-2">
            {ADDRESS_ROWS.map((row) => (
              <div key={row.key}>
                <dt className="text-[12px] font-semibold tracking-[0.04em] text-faint uppercase">
                  {t(`address.${row.key}`)}
                </dt>
                <dd className="mt-0.5 text-[14px] leading-snug font-semibold text-ink">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 border-t border-subtle pt-4 text-[13px] leading-relaxed text-muted">
            {t('addressNote')}
          </p>
        </div>
      </Section>

      <Section title={t('moneyTitle')}>
        <div className="grid gap-4 sm:grid-cols-3">
          {MONEY_KEYS.map((key) => (
            <article key={key} className="rounded-card border border-subtle bg-surface p-5">
              <h3 className="mb-1.5 text-[14px] leading-snug font-semibold text-ink">
                {t(`money.${key}.heading`)}
              </h3>
              <p className="text-[13px] leading-relaxed text-muted">{t(`money.${key}.body`)}</p>
            </article>
          ))}
        </div>
        {/* Refund requests are a favourite cover for card fraud; saying out
            loud what the shop never asks for is the cheapest protection. */}
        <p className="mt-4 rounded-card border border-alert-edge bg-alert-soft px-5 py-3.5 text-[13px] leading-relaxed text-alert">
          {t('moneyWarning')}
        </p>
      </Section>

      <Section title={t('exclusionsTitle')}>
        <div className="grid gap-5 rounded-card border border-subtle bg-surface p-7">
          {EXCLUSION_KEYS.map((key) => (
            <section key={key}>
              <h3 className="mb-1.5 text-[14px] leading-snug font-semibold text-ink">
                {t(`exclusions.${key}.heading`)}
              </h3>
              <p className="max-w-[76ch] text-[13.5px] leading-relaxed text-pretty text-muted">
                {t(`exclusions.${key}.body`)}
              </p>
              {key === 'custom' ? (
                <Link
                  href={CUSTOM_ORDER_HREF}
                  className="mt-1.5 inline-block text-[13px] font-semibold text-accent-hover hover:underline"
                >
                  {t('exclusions.custom.link')} →
                </Link>
              ) : null}
            </section>
          ))}
        </div>
      </Section>

      <section className="rounded-card border border-accent-mid bg-accent-tint p-7">
        <h2 className="mb-2 font-display text-h3 font-bold text-ink">{t('cta.title')}</h2>
        <p className="mb-5 max-w-[60ch] text-[13.5px] leading-relaxed text-muted">{t('cta.body')}</p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <a href={COMPANY.phoneHref}>
              {t('cta.call')} {COMPANY.phone}
            </a>
          </Button>
          {TELEGRAM_HREF ? (
            <Button variant="secondary" asChild>
              <a href={TELEGRAM_HREF} target="_blank" rel="noopener noreferrer">
                {t('cta.telegram')}
              </a>
            </Button>
          ) : null}
        </div>
      </section>
    </div>
  )
}

function Section({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <section className="mb-11">
      <h2 className="mb-4 font-display text-[21px] font-bold tracking-[-0.01em] text-ink">
        {title}
      </h2>
      {children}
    </section>
  )
}

type CaseCardProps = {
  readonly badge: string
  readonly badgeClass: string
  readonly title: string
  readonly lead: string
  readonly children: ReactNode
}

function CaseCard({ badge, badgeClass, title, lead, children }: CaseCardProps) {
  return (
    <article className="flex flex-col rounded-card border border-subtle bg-surface p-6">
      <span
        className={cn(
          'mb-3 inline-block w-fit rounded-pill px-2.5 py-1.5 text-[11px] font-semibold',
          badgeClass,
        )}
      >
        {badge}
      </span>
      <h3 className="mb-2 font-display text-[18px] leading-snug font-bold text-ink">{title}</h3>
      <p className="mb-4 text-[13.5px] leading-relaxed text-muted">{lead}</p>
      {children}
    </article>
  )
}

function Steps({ title, steps }: { readonly title: string; readonly steps: readonly string[] }) {
  return (
    <div className="mt-auto border-t border-subtle pt-4">
      <p className="mb-3 text-[12px] font-semibold tracking-[0.04em] text-faint uppercase">
        {title}
      </p>
      <ol className="grid gap-3">
        {steps.map((step, index) => (
          <li key={step} className="flex gap-3 text-[13px] leading-relaxed text-ink">
            <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-pill bg-ink font-display text-[12px] font-bold text-on-dark">
              {index + 1}
            </span>
            <span className="pt-0.5">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function CheckMark() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className="mt-0.5 shrink-0 text-accent-hover"
    >
      <path
        d="m3.5 8.5 3 3 6-7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
