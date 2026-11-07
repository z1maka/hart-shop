import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getSettlementsBoard, SettlementsBoard } from '@/features/settlements'

export const metadata: Metadata = { title: 'Расчёты с цехом' }

export default function AdminSettlementsPage() {
  return (
    <Suspense fallback={<p className="text-[13.5px] text-muted">Загружаем расчёты…</p>}>
      <Board />
    </Suspense>
  )
}

async function Board() {
  return <SettlementsBoard view={await getSettlementsBoard()} />
}
