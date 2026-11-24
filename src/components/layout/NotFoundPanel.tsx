import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export type NotFoundLink = {
  readonly href: string
  readonly label: string
}

type NotFoundPanelProps = {
  // Where to go instead; empty on pages that have no catalogue behind them.
  readonly links?: readonly NotFoundLink[]
}

export async function NotFoundPanel({ links = [] }: NotFoundPanelProps) {
  const t = await getTranslations('notFound')
  // The lead points at the categories under it; without them it would
  // promise a list that is not there.
  const copy =
    links.length > 0
      ? { title: 'code404Title', lead: 'code404Lead' }
      : { title: 'plainTitle', lead: 'plainLead' }

  return (
    <section className="px-7 pt-16 pb-20 text-center">
      <p className="font-display text-[clamp(96px,22vw,220px)] leading-[0.85] font-semibold tracking-[-0.05em] text-ink">
        404
      </p>

      <h1 className="mx-auto mt-6 max-w-[22ch] font-display text-h2 font-semibold text-ink">
        {t(copy.title)}
      </h1>
      <p className="mx-auto mt-3 max-w-[54ch] text-body leading-relaxed text-muted">
        {t(copy.lead)}
      </p>

      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Button size="lg" asChild>
          <Link href="/shop/">{t('browse')}</Link>
        </Button>
        <Button size="lg" variant="secondary" asChild>
          <Link href="/">{t('backHome')}</Link>
        </Button>
      </div>

      {links.length > 0 ? (
        <nav className="mx-auto mt-10 flex max-w-[64ch] flex-wrap justify-center gap-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex min-h-11 items-center rounded-chip border border-strong bg-raised px-4 text-small font-medium text-ink transition-colors hover:border-accent hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </section>
  )
}
