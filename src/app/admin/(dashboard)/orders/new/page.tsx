import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { getActiveResellers } from '@/features/admin/queries/get-resellers'
import { PartnerOrderForm } from '@/features/admin/ui/PartnerOrderForm'

export const metadata: Metadata = {
  title: 'Новый заказ партнёра',
  robots: { index: false, follow: false },
}

export default function NewPartnerOrderPage() {
  return (
    <div>
      <Link
        href="/admin/orders"
        className="mb-3 inline-block text-[13px] font-semibold text-accent-hover hover:underline"
      >
        ← Ко всем заказам
      </Link>
      <h1 className="mb-1.5 font-display text-[22px] font-bold text-ink">Новый заказ партнёра</h1>
      <p className="mb-5 max-w-[80ch] text-[13px] leading-relaxed text-muted">
        Партнёр продаёт от своего имени: получателю не уходит ни писем, ни SMS, в посылку не кладём
        наших прайсов. В статистику заказ попадёт по цене дропшиппера, в рекламу — не попадёт.
      </p>
      <Suspense fallback={<p className="text-[13.5px] text-muted">Загружаем партнёров…</p>}>
        <Form />
      </Suspense>
    </div>
  )
}

async function Form() {
  const resellers = await getActiveResellers()

  return <PartnerOrderForm resellers={resellers} />
}
