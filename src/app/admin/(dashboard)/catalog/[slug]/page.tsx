import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getProductEditorView } from '@/features/admin/queries/get-product-draft'
import { ProductEditor } from '@/features/admin/ui/ProductEditor'
import { decodeSlugParam } from '@/lib/slug'
import { env } from '@/lib/env'

export const metadata: Metadata = { title: 'Товар' }

export default function AdminProductPage({ params }: PageProps<'/admin/catalog/[slug]'>) {
  return (
    <Suspense fallback={<p className="text-[13.5px] text-muted">Загружаем товар…</p>}>
      <Editor params={params} />
    </Suspense>
  )
}

async function Editor({ params }: { params: PageProps<'/admin/catalog/[slug]'>['params'] }) {
  const { slug } = await params
  const product = await getProductEditorView(decodeSlugParam(slug))

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <ProductEditor
        product={product}
        siteHost={new URL(env.NEXT_PUBLIC_SITE_URL).host}
        formVersion={env.APP_BUILD_ID}
      />
    </div>
  )
}
