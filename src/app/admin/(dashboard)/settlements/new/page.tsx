import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { getSettlementCandidates, SettlementPicker } from '@/features/settlements'

export const metadata: Metadata = { title: 'Новый акт' }

export default function NewSettlementPage({ searchParams }: PageProps<'/admin/settlements/new'>) {
  return (
    <Suspense fallback={<p className="text-[13.5px] text-muted">Собираем посылки…</p>}>
      <Candidates searchParams={searchParams} />
    </Suspense>
  )
}

function textParam(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined
}

async function Candidates({
  searchParams,
}: Pick<PageProps<'/admin/settlements/new'>, 'searchParams'>) {
  const params = await searchParams
  const view = await getSettlementCandidates(textParam(params.from), textParam(params.to))

  return (
    <div className="grid gap-5">
      <Link
        href="/admin/settlements/"
        className="text-[13px] font-semibold text-ink underline underline-offset-4"
      >
        ← Расчёты с цехом
      </Link>
      {view.isPeriodValid ? (
        <>
          <header>
            <h1 className="font-display text-[19px] font-bold text-ink">
              Новый акт · посылки забраны {view.periodLabel}
            </h1>
            <p className="mt-1 text-[13px] text-muted">
              {view.feeLabel
                ? `Комиссия Новой Почты: ${view.feeLabel} — только у наложенного платежа.`
                : 'Комиссия Новой Почты не указана: сначала задайте её на странице расчётов.'}
            </p>
            {view.isTruncated ? (
              <p className="mt-1 text-[13px] font-semibold text-alert">
                За эти дни больше {view.maxRows} посылок — показаны первые {view.maxRows}. Разбейте
                период на части.
              </p>
            ) : null}
          </header>
          <SettlementPicker
            periodFrom={view.periodFrom}
            periodTo={view.periodTo}
            isFeeSet={view.feeLabel !== null}
            sales={view.sales}
            returns={view.returns}
          />
        </>
      ) : (
        <p className="text-[13.5px] text-alert">
          Даты не подошли: нужен период не длиннее года, начало не позже конца.
        </p>
      )}
    </div>
  )
}
