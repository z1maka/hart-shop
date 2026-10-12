import type { Metadata } from 'next'
import { Suspense } from 'react'
import { CategoriesCatalog } from '@/features/admin'

export const metadata: Metadata = { title: 'Категории' }

export default function AdminCategoriesPage() {
  return (
    <Suspense fallback={<p className="text-[13.5px] text-muted">Загружаем категории…</p>}>
      <CategoriesCatalog />
    </Suspense>
  )
}
