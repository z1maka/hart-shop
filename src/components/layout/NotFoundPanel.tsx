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
    <section className="relative overflow-hidden px-7 pt-16 pb-20 text-center">
      <Decor />

      <p className="relative font-display text-[clamp(96px,22vw,220px)] leading-[0.85] font-bold tracking-[-0.05em] text-ink">
        404
      </p>

      <h1 className="relative mx-auto mt-6 max-w-[22ch] font-display text-h2 font-bold text-ink">
        {t(copy.title)}
      </h1>
      <p className="relative mx-auto mt-3 max-w-[54ch] text-[14.5px] leading-relaxed text-muted">
        {t(copy.lead)}
      </p>

      <div className="relative mt-7 flex flex-wrap justify-center gap-3">
        <Button size="lg" asChild>
          <Link href="/shop">{t('browse')}</Link>
        </Button>
        <Button size="lg" variant="secondary" asChild>
          <Link href="/">{t('backHome')}</Link>
        </Button>
      </div>

      {links.length > 0 ? (
        <nav className="relative mx-auto mt-10 flex max-w-[64ch] flex-wrap justify-center gap-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex min-h-11 items-center rounded-pill border border-subtle bg-surface px-4 text-[13.5px] font-medium text-ink transition-colors hover:border-accent hover:text-accent-hover"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </section>
  )
}

// The dotted field and the two crosses of the old shop's page, kept as plain
// CSS so nothing is downloaded for a page nobody means to open.
function Decor() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 select-none">
      <div className="absolute top-[12%] left-1/2 hidden size-32 -translate-x-[220%] bg-[radial-gradient(var(--color-subtle)_1.6px,transparent_1.6px)] bg-[length:16px_16px] sm:block" />
      <div className="absolute top-[8%] left-1/2 hidden size-28 translate-x-[180%] bg-[radial-gradient(var(--color-subtle)_1.6px,transparent_1.6px)] bg-[length:16px_16px] sm:block" />
      <span className="absolute top-[22%] left-[14%] font-display text-[clamp(28px,4vw,44px)] leading-none font-bold text-accent/70">
        ✕
      </span>
      <span className="absolute top-[38%] right-[12%] font-display text-[clamp(22px,3vw,34px)] leading-none font-bold text-strong/60">
        ✕
      </span>
    </div>
  )
}
