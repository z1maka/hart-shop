import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { organizationJsonLd, webPageJsonLd } from '@/lib/seo'
import { cn } from '@/lib/utils'
import { getTranslations } from 'next-intl/server'
import {
  CONTACT_TOPIC_IDS,
  CUSTOM_ORDER_EXAMPLE_KEYS,
  liveContactChannels,
  type ContactTopic,
} from '@/config/contact'
import { JsonLd } from '@/components/JsonLd'
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
  { href: '/delivery/', key: 'shipping' },
  { href: '/refund-policy/', key: 'returns' },
] as const

// The design sets the fastest channel apart on a dark card.
const HIGHLIGHTED_CHANNEL = 'telegram'

export default async function ContactPage({ searchParams }: PageProps<'/contact'>) {
  const [t, metaT] = await Promise.all([getTranslations('contact'), getTranslations('meta')])

  const topics: ContactTopic[] = CONTACT_TOPIC_IDS.map((id) => ({
    id,
    label: t(`topics.${id}.label`),
    detail: t(`topics.${id}.detail`),
  }))

  return (
    <div className="px-7 pt-11 pb-16">
      <JsonLd
        data={[
          organizationJsonLd(),
          webPageJsonLd({
            kind: 'ContactPage',
            path: '/contact/',
            name: metaT('contact.title'),
            description: metaT('contact.description'),
          }),
        ]}
      />
      <h1 className="mb-3 font-display text-h1 font-bold text-ink">{t('title')}</h1>
      <p className="mb-8 max-w-[64ch] text-[15px] leading-relaxed text-muted">{t('lead')}</p>

      <div className="mb-9 grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3.5">
        {liveContactChannels().map((channel) => (
          <a
            key={channel.key}
            href={channel.href}
            {...(channel.href.startsWith('http')
              ? { target: '_blank', rel: 'noopener noreferrer' }
              : {})}
            className={cn(
              'flex flex-col gap-2 rounded-card p-5 transition-colors',
              channel.key === HIGHLIGHTED_CHANNEL
                ? 'bg-header hover:bg-ink-hover'
                : 'border border-subtle bg-raised hover:border-strong',
            )}
          >
            <h2
              className={cn(
                'font-display text-[18px] font-semibold tracking-[0.06em]',
                channel.key === HIGHLIGHTED_CHANNEL ? 'text-khaki' : 'text-ink',
              )}
            >
              {t(`channels.${channel.key}.name`)}
            </h2>
            <p
              className={cn(
                'text-[15px] font-bold break-words',
                channel.key === HIGHLIGHTED_CHANNEL ? 'text-on-dark' : 'text-ink',
              )}
            >
              {channel.handle}
            </p>
            <p
              className={cn(
                'flex-1 text-[13px] leading-relaxed',
                channel.key === HIGHLIGHTED_CHANNEL ? 'text-on-dark-muted' : 'text-muted',
              )}
            >
              {t(`channels.${channel.key}.detail`)}
            </p>
            <p
              className={cn(
                'pt-1 text-[13px] font-bold',
                channel.key === HIGHLIGHTED_CHANNEL ? 'text-on-dark' : 'text-accent',
              )}
            >
              {t(`channels.${channel.key}.cta`)} →
            </p>
          </a>
        ))}
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <div className="min-w-[min(100%,320px)] flex-[999_1_460px]">
          {/* Before the form, not after it: most questions are answered on
              these pages faster than by a reply. */}
          <section className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-l-[3px] border-khaki-mark bg-accent-tint px-5 py-3.5">
            <p className="text-[13px] leading-relaxed text-muted">
              <span className="font-bold text-ink">{t('beforeTitle')}.</span> {t('beforeLead')}
            </p>
            {BEFORE_YOU_WRITE.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[13px] font-bold text-accent hover:text-ink"
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
            <h2 className="mb-3 font-display text-[16px] font-semibold tracking-[0.08em] text-ink">
              {t('customTitle')}
            </h2>
            <ul className="grid gap-2.5">
              {CUSTOM_ORDER_EXAMPLE_KEYS.map((key) => (
                <li key={key} className="flex gap-2.5 text-[13px] leading-relaxed text-muted">
                  <span className="mt-1.5 size-1.5 shrink-0 bg-khaki-mark" aria-hidden />
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
