import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Suspense } from 'react'
import { getBuyerInvoiceDocument } from '@/features/invoices'
import { InvoiceDocument } from '@/features/invoices/ui/InvoiceDocument'
import { PrintButton } from '@/features/invoices/ui/PrintButton'

export const metadata: Metadata = {
  title: 'Рахунок',
  robots: { index: false, follow: false },
}

// The invoice the admin sends a buyer as a link: outside the shop's chrome,
// A4, saved as PDF from the browser's own dialog. The order's secret token
// is the only key, as for the order page.
const PRINT_STYLES = `
@page { size: A4; margin: 14mm 16mm; }
@media print {
  body { background: #fff !important; }
}
`

export default function BuyerInvoicePage({ params }: PageProps<'/order/[token]/invoice'>) {
  return (
    <Suspense fallback={<p className="p-6 text-[13.5px] text-muted">…</p>}>
      <InvoiceSheet params={params} />
    </Suspense>
  )
}

async function InvoiceSheet({ params }: { params: PageProps<'/order/[token]/invoice'>['params'] }) {
  const { token } = await params
  const [invoice, t] = await Promise.all([
    getBuyerInvoiceDocument(token),
    getTranslations('invoicePage'),
  ])
  if (!invoice) notFound()

  return (
    <div className="min-h-screen bg-hover pb-10 print:bg-white print:pb-0">
      <style>{PRINT_STYLES}</style>
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 bg-ink px-4 py-3 text-on-dark sm:px-7 print:hidden">
        <span className="text-[13px] font-semibold">
          {t('heading', { number: invoice.number })}
        </span>
        <PrintButton label={t('save')} />
        <p className="w-full text-[12px] text-on-dark/70">{t('hint')}</p>
      </div>
      <div className="overflow-x-auto px-4 pt-6 sm:px-7 print:overflow-visible print:p-0">
        <InvoiceDocument invoice={invoice} />
      </div>
    </div>
  )
}
