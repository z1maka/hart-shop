import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getBankAccountsBoard } from '@/features/admin/queries/get-bank-accounts'
import { BankAccountsBoard } from '@/features/admin/ui/BankAccountsBoard'
import { SettingsNav } from '@/features/admin/ui/SettingsNav'

export const metadata: Metadata = {
  title: 'Реквизиты',
  robots: { index: false, follow: false },
}

export default function AdminRequisitesSettingsPage() {
  return (
    <div className="flex flex-wrap items-start gap-6">
      <SettingsNav current="/admin/settings/requisites" />
      <div className="min-w-[min(100%,320px)] flex-[999_1_560px]">
        <Suspense fallback={<p className="text-[13.5px] text-muted">Загружаем счета…</p>}>
          <Board />
        </Suspense>
      </div>
    </div>
  )
}

async function Board() {
  const accounts = await getBankAccountsBoard()

  return <BankAccountsBoard accounts={accounts} />
}
