import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getFeaturedBoard } from '@/features/admin/queries/get-storefront'
import { FeaturedBoard } from '@/features/admin/ui/FeaturedBoard'

export const metadata: Metadata = {
  title: 'Витрина',
  robots: { index: false, follow: false },
}

export default function AdminStorefrontPage() {
  return (
    <Suspense fallback={<p className="text-[13.5px] text-muted">Загружаем витрину…</p>}>
      <Board />
    </Suspense>
  )
}

async function Board() {
  const board = await getFeaturedBoard()

  return (
    <FeaturedBoard initialItems={board.items} initialMode={board.mode} limit={board.limit} />
  )
}
