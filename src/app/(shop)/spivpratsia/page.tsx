import type { Metadata } from 'next'
import Image from 'next/image'
import { getTranslations } from 'next-intl/server'
import { Button } from '@/components/ui/Button'
import { COMPANY } from '@/config/company'
import {
  PARTNER_FAQ_KEYS,
  PARTNER_MODEL_IDS,
  PARTNER_OFFER_KEYS,
  PARTNER_OFFERED_MODEL_IDS,
  PARTNER_REQUIREMENT_KEYS,
  PARTNER_STEP_KEYS,
  PARTNERS_HERO_PHOTO,
  PARTNERS_HREF,
} from '@/config/partners'
import {
  PartnerApplicationForm,
  type PartnerModelOption,
} from '@/features/enquiries/ui/PartnerApplicationForm'

const FORM_ANCHOR = 'zayavka'
const FACT_KEYS = ['models', 'seller', 'delivery'] as const

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('partnersPage.meta')

  return {
    title: t('title'),
    description: t('description'),
    alternates: { canonical: PARTNERS_HREF },
    openGraph: { title: t('title'), description: t('description'), type: 'website' },
  }
}

// For other makers: what the shop does with their goods, in which two
// formats, what it asks of them, and the application. The buyer always deals
// with the shop, so the page promises the maker channels, not a marketplace.
export default async function PartnersPage() {
  const t = await getTranslations('partnersPage')
  const models: PartnerModelOption[] = PARTNER_MODEL_IDS.map((id) => ({
    id,
    label: t(`form.models.${id}`),
  }))

  return (
    <div className="pb-14">
      <section className="grid grid-cols-[repeat(auto-fit,minmax(min(340px,100%),1fr))] items-center gap-9 px-7 py-12">
        <div>
          <p className="mb-5 inline-block border-l-[3px] border-khaki-mark bg-sunken px-3.5 py-2 font-display text-[12.5px] font-semibold tracking-[0.12em] text-accent">
            {t('kicker')}
          </p>
          <h1 className="mb-4 max-w-[18ch] font-display text-display font-bold text-balance text-ink">
            {t('title')}
          </h1>
          <p className="mb-6 max-w-[52ch] text-[16.5px] leading-relaxed text-pretty text-muted">
            {t('lead')}
          </p>

          <ul className="mb-7 flex flex-wrap gap-2">
            {FACT_KEYS.map((key) => (
              <li
                key={key}
                className="rounded-chip border border-strong bg-raised px-3 py-1.5 text-[12.5px] font-semibold text-ink"
              >
                {t(`facts.${key}`)}
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <a href={`#${FORM_ANCHOR}`}>{t('heroCta')}</a>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <a href={COMPANY.phoneHref}>{t('callCta')}</a>
            </Button>
          </div>
        </div>

        <div className="relative aspect-5/4 overflow-hidden rounded-card bg-sunken">
          <Image
            src={PARTNERS_HERO_PHOTO.url}
            alt={PARTNERS_HERO_PHOTO.alt}
            fill
            priority
            sizes="(min-width: 1024px) 520px, 100vw"
            className="object-cover"
          />
        </div>
      </section>

      <section className="border-t border-subtle bg-surface px-7 py-12">
        <h2 className="mb-2.5 font-display text-h2 font-bold text-ink">{t('offerTitle')}</h2>
        <p className="mb-7 max-w-[62ch] text-[14.5px] leading-relaxed text-muted">{t('offerLead')}</p>
        <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-5">
          {PARTNER_OFFER_KEYS.map((key) => (
            <li key={key} className="rounded-card border border-subtle bg-raised p-5">
              <h3 className="mb-1.5 text-[14px] font-semibold text-ink">
                {t(`offer.${key}.title`)}
              </h3>
              <p className="text-[12.5px] leading-relaxed text-muted">{t(`offer.${key}.body`)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="px-7 py-12">
        <h2 className="mb-2.5 font-display text-h2 font-bold text-ink">{t('modelsTitle')}</h2>
        <p className="mb-7 max-w-[62ch] text-[14.5px] leading-relaxed text-muted">
          {t('modelsLead')}
        </p>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-5">
          {PARTNER_OFFERED_MODEL_IDS.map((id) => (
            <article
              key={id}
              className="rounded-card border-l-[3px] border-khaki-mark bg-header p-7 text-on-dark"
            >
              <h3 className="mb-2.5 font-display text-h3 font-bold">{t(`models.${id}.title`)}</h3>
              <p className="mb-4 text-[14px] leading-relaxed text-on-dark-muted">
                {t(`models.${id}.body`)}
              </p>
              <p className="text-[12.5px] font-semibold text-khaki">{t(`models.${id}.fit`)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-subtle bg-surface px-7 py-12">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(340px,100%),1fr))] gap-9">
          <div>
            <h2 className="mb-2.5 font-display text-h2 font-bold text-ink">{t('whoTitle')}</h2>
            <p className="mb-6 max-w-[56ch] text-[14.5px] leading-relaxed text-muted">
              {t('whoLead')}
            </p>
            <ul className="grid gap-3">
              {PARTNER_REQUIREMENT_KEYS.map((key) => (
                <li
                  key={key}
                  className="rounded-card border border-subtle bg-raised px-5 py-4 text-[13.5px] leading-relaxed text-ink"
                >
                  {t(`who.${key}`)}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="mb-2.5 font-display text-h2 font-bold text-ink">{t('stepsTitle')}</h2>
            <p className="mb-6 max-w-[56ch] text-[14.5px] leading-relaxed text-muted">
              {t('stepsLead')}
            </p>
            <ol className="grid gap-3">
              {PARTNER_STEP_KEYS.map((key, index) => (
                <li
                  key={key}
                  className="flex gap-4 rounded-card border border-subtle bg-raised px-5 py-4"
                >
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-chip bg-ink font-display text-[14px] font-bold text-on-dark">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="mb-1 text-[13.5px] font-semibold text-ink">
                      {t(`steps.${key}.title`)}
                    </h3>
                    <p className="text-[12.5px] leading-relaxed text-muted">
                      {t(`steps.${key}.body`)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section id={FORM_ANCHOR} className="scroll-mt-24 px-7 py-12">
        <div className="flex flex-wrap items-start gap-8">
          <div className="min-w-[min(100%,320px)] flex-[999_1_460px]">
            <h2 className="mb-2.5 font-display text-h2 font-bold text-ink">{t('formTitle')}</h2>
            <p className="mb-6 max-w-[56ch] text-[14.5px] leading-relaxed text-muted">
              {t('formLead')}
            </p>
            <PartnerApplicationForm models={models} />
          </div>

          <aside className="min-w-[min(100%,280px)] flex-[1_1_300px]">
            <div className="rounded-card border border-subtle bg-raised p-5">
              <h3 className="mb-3 text-[14px] font-semibold text-ink">{t('channelsTitle')}</h3>
              <p className="mb-4 text-[12.5px] leading-relaxed text-muted">{t('channelsLead')}</p>
              <div className="grid gap-2">
                <a
                  href={COMPANY.phoneHref}
                  className="text-[13.5px] font-semibold text-accent hover:underline"
                >
                  {COMPANY.phone}
                </a>
                <a
                  href={`mailto:${COMPANY.email}`}
                  className="text-[13.5px] font-semibold text-accent hover:underline"
                >
                  {COMPANY.email}
                </a>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="border-t border-subtle bg-surface px-7 py-12">
        <h2 className="mb-6 font-display text-h2 font-bold text-ink">{t('faqTitle')}</h2>
        <div className="grid gap-3">
          {PARTNER_FAQ_KEYS.map((key) => (
            <details key={key} className="rounded-card border border-subtle bg-raised px-5 py-4">
              <summary className="cursor-pointer list-none text-[14px] font-semibold text-ink">
                {t(`faq.${key}.question`)}
              </summary>
              <p className="mt-2.5 max-w-[68ch] text-[13.5px] leading-relaxed text-muted">
                {t(`faq.${key}.answer`)}
              </p>
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}
