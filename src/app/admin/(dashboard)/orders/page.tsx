import type { Metadata } from 'next'
import { Suspense } from 'react'
import { OrderTable } from '@/features/admin/ui/OrderTable'

export const metadata: Metadata = { title: 'Заказы' }

// The daily round issues up to ten waybills in one action, and the carrier
// answers in a second or two per parcel.
export const maxDuration = 60

export default function AdminOrdersPage({ searchParams }: PageProps<'/admin/orders'>) {
  return (
    <Suspense fallback={<p className="text-[13.5px] text-muted">Загружаем заказы…</p>}>
      <OrderTable searchParams={searchParams} />
    </Suspense>
  )
}
