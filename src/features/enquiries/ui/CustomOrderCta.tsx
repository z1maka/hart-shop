import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Button } from '@/components/ui/Button'
import { CUSTOM_ORDER_HREF } from '@/config/custom-order'

// The same offer on a product page, where the question is about this model.
export async function CustomOrderNote() {
  const t = await getTranslations('customOrder')

  return (
    <section className="flex flex-wrap items-center gap-x-8 gap-y-5 rounded-card bg-header px-7 py-6.5">
      <div className="flex-[999_1_420px]">
        <h2 className="mb-1.5 font-display text-[24px] font-bold tracking-[0.04em] text-on-dark">
          {t('productTitle')}
        </h2>
        <p className="max-w-[60ch] text-[13.5px] leading-relaxed text-on-dark-muted">
          {t('productLead')}
        </p>
      </div>
      <Button size="lg" variant="khaki" asChild>
        <Link href={CUSTOM_ORDER_HREF}>{t('cta')}</Link>
      </Button>
    </section>
  )
}
