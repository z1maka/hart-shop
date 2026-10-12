import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Button } from '@/components/ui/Button'
import { COMPANY } from '@/config/company'
import { CUSTOM_ORDER_EXAMPLE_KEYS } from '@/config/contact'
import { CUSTOM_ORDER_HREF } from '@/config/custom-order'

export async function CustomOrderBand() {
  const t = await getTranslations('customOrder')

  return (
    <section className="px-7 pb-12">
      <div className="flex flex-wrap items-center gap-x-9 gap-y-6 rounded-card bg-header px-7 py-8">
        <div className="min-w-[min(100%,300px)] flex-[999_1_420px]">
          <p className="mb-2 text-[12.5px] font-bold text-khaki">{t('kicker')}</p>
          <h2 className="mb-2.5 font-display text-h2 font-bold text-on-dark">{t('title')}</h2>
          <p className="max-w-[62ch] text-[14.5px] leading-relaxed text-on-dark-muted">
            {t('lead')}
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {CUSTOM_ORDER_EXAMPLE_KEYS.map((key) => (
              <li
                key={key}
                className="rounded-chip border border-dark-edge px-3 py-1.5 text-[12.5px] font-semibold text-on-dark"
              >
                {t(`examples.${key}`)}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex min-w-[min(100%,220px)] flex-[1_1_220px] flex-col gap-2.5">
          <Button size="lg" variant="khaki" asChild>
            <Link href={CUSTOM_ORDER_HREF}>{t('cta')}</Link>
          </Button>
          <Button size="lg" variant="outlineOnDark" asChild>
            <a href={COMPANY.phoneHref}>{t('callCta')}</a>
          </Button>
          <p className="text-[12px] leading-relaxed text-on-dark-muted">{t('answerTime')}</p>
        </div>
      </div>
    </section>
  )
}

// The same offer on a product page, where the question is about this model.
export async function CustomOrderNote() {
  const t = await getTranslations('customOrder')

  return (
    <section className="rounded-card border border-accent-mid bg-accent-tint p-6">
      <h2 className="mb-2 font-display text-h3 font-bold text-ink">{t('productTitle')}</h2>
      <p className="mb-4 max-w-[52ch] text-[13.5px] leading-relaxed text-muted">
        {t('productLead')}
      </p>
      <Button asChild>
        <Link href={CUSTOM_ORDER_HREF}>{t('cta')}</Link>
      </Button>
    </section>
  )
}
