import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getCarrierAccountsBoard } from '@/features/admin/queries/get-carrier-accounts'
import { CarrierAccountsBoard } from '@/features/admin/ui/CarrierAccountsBoard'
import { SettingsNav } from '@/features/admin/ui/SettingsNav'

export const metadata: Metadata = {
  title: 'Новая Почта',
  robots: { index: false, follow: false },
}

export default function AdminNovaPostSettingsPage() {
  return (
    <div className="flex flex-wrap items-start gap-6">
      <SettingsNav current="/admin/settings/nova-post" />
      <div className="min-w-[min(100%,320px)] flex-[999_1_560px]">
        <Suspense fallback={<p className="text-[13.5px] text-muted">Загружаем кабинеты…</p>}>
          <Board />
        </Suspense>
      </div>
    </div>
  )
}

async function Board() {
  const board = await getCarrierAccountsBoard()

  return <CarrierAccountsBoard accounts={board.accounts} warehouse={board.warehouse} />
}
