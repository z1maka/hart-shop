import type { Metadata } from 'next'
import { Suspense } from 'react'
import { EarningsBoard } from '@/features/admin/ui/EarningsBoard'
import { WorkshopBalancePanel } from '@/features/settlements'

export const metadata: Metadata = { title: 'Статистика' }

export default function AdminStatsPage({ searchParams }: PageProps<'/admin/stats'>) {
  return (
    <div className="grid gap-7">
      <Suspense fallback={<p className="text-[13.5px] text-muted">Считаем заработок…</p>}>
        <EarningsBoard searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<p className="text-[13.5px] text-muted">Считаем расчёты с цехом…</p>}>
        <WorkshopBalancePanel />
      </Suspense>
    </div>
  )
}
