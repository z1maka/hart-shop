import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { SHIPPING_RATE_TIERS } from '@/config/delivery'
import { createMoney, Currency, formatMoney } from '@/lib/money'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta')

  return {
    title: t('delivery.title'),
    description: t('delivery.description'),
    alternates: {
      // Canonical mirrors the indexed WordPress URL, trailing slash included.
      canonical: '/delivery/',
    },
  }
}

const SHIPPING_KEYS = ['branch', 'locker', 'courier'] as const
const PAYMENT_KEYS = ['cod', 'card', 'invoice'] as const
const WARRANTY_KEYS = ['period', 'seasons', 'law'] as const
const GRAMS_PER_KILO = 1000

// The rates the product markup and Merchant Center state, said in words so
// a visitor reads the same figure Google does.
const SHIPPING_ESTIMATE = Object.fromEntries(
  SHIPPING_RATE_TIERS.flatMap((tier, index) => [
    [`kilos${index + 1}`, tier.maxGrams / GRAMS_PER_KILO],
    [`rate${index + 1}`, formatMoney(createMoney(tier.rateCents, Currency.Uah))],
  ]),
)

export default async function DeliveryPage() {
  const t = await getTranslations('deliveryPage')

  return (
    <div className="mx-auto max-w-4xl px-7 py-10">
      <h1 className="mb-3 font-display text-h1 font-bold text-ink">{t('title')}</h1>
      <p className="mb-8 max-w-[68ch] text-[14.5px] leading-relaxed text-muted">{t('lead')}</p>

      <Section title={t('shippingTitle')}>
        <div className="grid gap-4 sm:grid-cols-3">
          {SHIPPING_KEYS.map((key) => (
            <article key={key} className="rounded-card border border-subtle bg-surface p-5">
              <h3 className="mb-1.5 text-[14.5px] leading-snug font-semibold text-ink">
                {t(`shipping.${key}.heading`)}
              </h3>
              <p className="text-[13.5px] leading-relaxed text-muted">{t(`shipping.${key}.body`)}</p>
            </article>
          ))}
        </div>
        <p className="mt-4 text-[13px] leading-relaxed text-faint">
          {t('shippingNote')} {t('shippingEstimate', SHIPPING_ESTIMATE)}
        </p>
      </Section>

      <Section title={t('paymentTitle')}>
        <div className="grid gap-4">
          {PAYMENT_KEYS.map((key) => (
            <article key={key} className="rounded-card border border-subtle bg-surface p-5">
              <h3 className="mb-1.5 text-[14.5px] leading-snug font-semibold text-ink">
                {t(`payment.${key}.heading`)}
              </h3>
              <p className="max-w-[76ch] text-[13.5px] leading-relaxed text-muted">
                {t(`payment.${key}.body`)}
              </p>
            </article>
          ))}
        </div>
      </Section>

      <Section title={t('warrantyTitle')}>
        <div className="grid gap-5 rounded-card border border-subtle bg-surface p-7">
          {WARRANTY_KEYS.map((key) => (
            <section key={key}>
              <h3 className="mb-1.5 text-[14.5px] leading-snug font-semibold text-ink">
                {t(`warranty.${key}.heading`)}
              </h3>
              <p className="max-w-[76ch] text-[13.5px] leading-relaxed text-pretty text-muted">
                {t(`warranty.${key}.body`)}
              </p>
            </section>
          ))}
        </div>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-9">
      <h2 className="mb-4 font-display text-[21px] font-bold tracking-[-0.01em] text-ink">
        {title}
      </h2>
      {children}
    </section>
  )
}
