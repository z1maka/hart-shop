import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getProductCategories } from '@/features/admin/queries/get-product-draft'
import { NewProductForm } from '@/features/admin/ui/NewProductForm'

export const metadata: Metadata = { title: 'Новый товар' }

export default function AdminNewProductPage() {
  return (
    <Suspense fallback={<p className="text-[13.5px] text-muted">Загружаем категории…</p>}>
      <NewProduct />
    </Suspense>
  )
}

async function NewProduct() {
  const categories = await getProductCategories()

  return <NewProductForm categories={categories} />
}
