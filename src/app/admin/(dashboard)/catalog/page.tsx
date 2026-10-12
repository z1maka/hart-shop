import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ProductsCatalog } from '@/features/admin'

export const metadata: Metadata = { title: 'Каталог' }

export default function AdminCatalogPage({ searchParams }: PageProps<'/admin/catalog'>) {
  return (
    <Suspense fallback={<p className="text-[13.5px] text-muted">Загружаем товары…</p>}>
      <ProductsCatalog searchParams={searchParams} />
    </Suspense>
  )
}
