import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import {
  CONTACT_TOPIC_IDS,
  CUSTOM_ORDER_EXAMPLE_KEYS,
  liveContactChannels,
  type ContactTopic,
} from '@/config/contact'
import { Skeleton } from '@/components/ui/Skeleton'
import { ContactForm } from '@/features/enquiries/ui/ContactForm'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta')

  return {
    title: t('contact.title'),
    description: t('contact.description'),
    alternates: {
      canonical: '/contact/',
    },
  }
}

const BEFORE_YOU_WRITE = [
  { href: '/delivery', key: 'shipping' },
  { href: '/refund-policy', key: 'returns' },
] as const

export default async function ContactPage({ searchParams }: PageProps<'/contact'>) {
  const t = await getTranslations('contact')

  const topics: ContactTopic[] = CONTACT_TOPIC_IDS.map((id) => ({
    id,
    label: t(`topics.${id}.label`),
    detail: t(`topics.${id}.detail`),
  }))

  return (
    <div className="px-7 py-10">
      <h1 className="mb-2.5 font-display text-h1 font-bold text-ink">{t('title')}</h1>
      <p className="mb-7 max-w-[66ch] text-[14.5px] leading-relaxed text-muted">{t('lead')}</p>

      <div className="mb-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {liveContactChannels().map((channel) => (
          <a
            key={channel.key}
            href={channel.href}
            {...(channel.href.startsWith('http')
              ? { target: '_blank', rel: 'noopener noreferrer' }
              : {})}
            className="flex flex-col gap-2 rounded-card border border-subtle bg-surface p-5 transition-colors hover:border-accent"
          >
            <p className="text-[12px] font-semibold text-faint">
              {t(`channels.${channel.key}.name`)}
            </p>
            <p className="font-display text-[17px] leading-tight font-bold text-alert">
              {channel.handle}
            </p>
            <p className="text-[12.5px] leading-relaxed text-muted">
              {t(`channels.${channel.key}.detail`)}
            </p>
            <p className="mt-auto pt-2 text-[12.5px] font-semibold text-accent-hover">
              {t(`channels.${channel.key}.cta`)} →
            </p>
          </a>
        ))}
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <div className="min-w-[min(100%,320px)] flex-[999_1_460px]">
          {/* Before the form, not after it: most questions are answered on
              these pages faster than by a reply. */}
          <section className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-card border border-subtle bg-surface px-5 py-3.5">
            <p className="text-[13px] leading-relaxed text-muted">
              <span className="font-semibold text-ink">{t('beforeTitle')}.</span> {t('beforeLead')}
            </p>
            {BEFORE_YOU_WRITE.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[13px] font-semibold text-accent-hover hover:underline"
              >
                {t(`beforeLinks.${link.key}`)} →
              </Link>
            ))}
          </section>
          {/* Only the preselected topic waits on the query string, so the
              rest of the page is served straight from the cache. */}
          <Suspense fallback={<Skeleton className="h-[520px] w-full rounded-card" />}>
            <ContactPanel topics={topics} searchParams={searchParams} />
          </Suspense>
        </div>

        <aside className="grid min-w-[min(100%,280px)] flex-[1_1_300px] gap-4">
          <section className="rounded-card border border-subtle bg-surface p-5">
            <h2 className="mb-3 text-[14px] font-semibold text-ink">{t('customTitle')}</h2>
            <ul className="grid gap-2.5">
              {CUSTOM_ORDER_EXAMPLE_KEYS.map((key) => (
                <li key={key} className="flex gap-2.5 text-[13px] leading-relaxed text-muted">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                  {t(`customExamples.${key}`)}
                </li>
              ))}
            </ul>
          </section>

        </aside>
      </div>
    </div>
  )
}

// A link that names its topic — «Індивідуальне замовлення» from the catalogue
// — opens the form with that choice already made.
async function ContactPanel({
  topics,
  searchParams,
}: {
  topics: readonly ContactTopic[]
  searchParams: PageProps<'/contact'>['searchParams']
}) {
  const requested = (await searchParams).topic
  const chosen = topics.find((topic) => topic.id === requested)

  return <ContactForm topics={topics} initialTopic={chosen?.id ?? topics[0]?.id ?? ''} />
}
