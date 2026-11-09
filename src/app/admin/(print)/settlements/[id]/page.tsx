import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { requireAdminSession } from '@/features/admin'
import { PrintButton } from '@/features/invoices/ui/PrintButton'
import { getSettlementDocument, SettlementControls, SettlementSheet } from '@/features/settlements'

export const metadata: Metadata = {
  title: 'Акт расчёта с цехом',
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

export default function SettlementPrintPage({ params }: PageProps<'/admin/settlements/[id]'>) {
  return (
    <Suspense fallback={<p className="p-6 text-[13.5px] text-muted">Загружаем акт…</p>}>
      <Sheet params={params} />
    </Suspense>
  )
}

async function Sheet({ params }: { params: PageProps<'/admin/settlements/[id]'>['params'] }) {
  await requireAdminSession()
  const { id } = await params
  const settlement = await getSettlementDocument(id)
  if (!settlement) notFound()

  return (
    <div className="min-h-screen bg-hover pb-10 print:bg-white print:pb-0">
      <style>{PRINT_STYLES}</style>
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 bg-ink px-4 py-3 text-on-dark sm:px-7 print:hidden">
        <Link href="/admin/settlements/" className="text-[13px] font-semibold">
          ← Расчёты с цехом
        </Link>
        <span className="text-[12.5px] text-on-dark/70">
          Акт № {settlement.number} ·{' '}
          {settlement.isPaid ? `оплачен ${settlement.paidOnLabel}` : 'ждём оплату'}
        </span>
        <div className="flex flex-wrap items-center gap-3">
          {settlement.isPaid ? null : (
            <SettlementControls
              settlementId={settlement.id}
              number={settlement.number}
              today={settlement.today}
            />
          )}
          <PrintButton label="Печать / PDF" />
        </div>
      </div>
      <div className="overflow-x-auto px-4 pt-6 sm:px-7 print:overflow-visible print:p-0">
        <SettlementSheet settlement={settlement} />
      </div>
    </div>
  )
}
