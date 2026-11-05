import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getResellersBoard } from '@/features/admin/queries/get-resellers'
import { ResellersBoard } from '@/features/admin/ui/ResellersBoard'
import { SettingsNav } from '@/features/admin/ui/SettingsNav'

export const metadata: Metadata = {
  title: 'Партнёры',
  robots: { index: false, follow: false },
}

export default function AdminResellersSettingsPage() {
  return (
    <div className="flex flex-wrap items-start gap-6">
      <SettingsNav current="/admin/settings/resellers" />
      <div className="min-w-[min(100%,320px)] flex-[999_1_560px]">
        <Suspense fallback={<p className="text-[13.5px] text-muted">Загружаем партнёров…</p>}>
          <Board />
        </Suspense>
      </div>
    </div>
  )
}

async function Board() {
  const resellers = await getResellersBoard()

  return <ResellersBoard resellers={resellers} />
}
