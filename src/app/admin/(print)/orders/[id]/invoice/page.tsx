import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { requireAdminSession } from '@/features/admin'
import { getInvoiceDocument } from '@/features/invoices'
import { InvoiceDocument } from '@/features/invoices/ui/InvoiceDocument'
import { PrintButton } from '@/features/invoices/ui/PrintButton'

export const metadata: Metadata = {
  title: 'Счёт',
  robots: { index: false, follow: false },
}

// Outside the panel's chrome: the sheet alone, A4, printed or saved as PDF
// from the browser's own dialog.
const PRINT_STYLES = `
@page { size: A4; margin: 14mm 16mm; }
@media print {
  body { background: #fff !important; }
}
`

export default function InvoicePrintPage({ params }: PageProps<'/admin/orders/[id]/invoice'>) {
  return (
    <Suspense fallback={<p className="p-6 text-[13.5px] text-muted">Загружаем счёт…</p>}>
      <InvoiceSheet params={params} />
    </Suspense>
  )
}

async function InvoiceSheet({
  params,
}: {
  params: PageProps<'/admin/orders/[id]/invoice'>['params']
}) {
  await requireAdminSession()
  const { id } = await params
  const invoice = await getInvoiceDocument(id)
  if (!invoice) notFound()

  return (
    <div className="min-h-screen bg-hover pb-10 print:bg-white print:pb-0">
      <style>{PRINT_STYLES}</style>
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 bg-ink px-4 py-3 text-on-dark sm:px-7 print:hidden">
        <Link href={`/admin/orders/${invoice.orderId}/`} className="text-[13px] font-semibold">
          ← {invoice.orderNumber}
        </Link>
        <span className="text-[12.5px] text-on-dark/70">
          Счёт № {invoice.number} · {invoice.isVoid ? 'аннулирован' : 'выставлен'}
        </span>
        <PrintButton label="Печать / PDF" />
      </div>
      <div className="overflow-x-auto px-4 pt-6 sm:px-7 print:overflow-visible print:p-0">
        <InvoiceDocument invoice={invoice} />
      </div>
    </div>
  )
}
