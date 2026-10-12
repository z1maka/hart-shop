import type { Metadata } from 'next'
import { Suspense } from 'react'
import { EnquiryList } from '@/features/admin/ui/EnquiryList'

export const metadata: Metadata = { title: 'Заявки' }

export default function AdminEnquiriesPage({ searchParams }: PageProps<'/admin/enquiries'>) {
  return (
    <Suspense fallback={<p className="text-[13.5px] text-muted">Загружаем заявки…</p>}>
      <EnquiryList searchParams={searchParams} />
    </Suspense>
  )
}
