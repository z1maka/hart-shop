import type { Metadata } from 'next'
import { Suspense } from 'react'
import { EarningsBoard } from '@/features/admin/ui/EarningsBoard'

export const metadata: Metadata = { title: 'Статистика' }

export default function AdminStatsPage({ searchParams }: PageProps<'/admin/stats'>) {
  return (
    <Suspense fallback={<p className="text-[13.5px] text-muted">Считаем заработок…</p>}>
      <EarningsBoard searchParams={searchParams} />
    </Suspense>
  )
}
