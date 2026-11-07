import Link from 'next/link'
import { getWorkshopBalance } from '@/features/settlements/queries/get-workshop-balance'

// Beside the earnings, never instead of them: what the workshop has paid of
// the shop's share, what the acts still wait for, and what is in no act yet.
export async function WorkshopBalancePanel() {
  const balance = await getWorkshopBalance()

  return (
    <section className="rounded-card border border-subtle bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[14px] font-semibold text-ink">Расчёты с цехом · за всё время</h2>
        <Link
          href="/admin/settlements/"
          className="text-[12.5px] font-semibold text-ink underline underline-offset-4"
        >
          Открыть расчёты →
        </Link>
      </div>
      <dl className="grid gap-4 sm:grid-cols-3">
        <Figure label="Получено от цеха" value={balance.receivedLabel} note="оплаченные акты" />
        <Figure
          label="Ждём по актам"
          value={balance.awaitingLabel}
          note={`актов: ${balance.awaitingCount}`}
        />
        <Figure
          label="Ещё не в актах"
          value={balance.unsettledLabel}
          note={`забранных посылок: ${balance.unsettledCount}${
            balance.pendingReturnsCount > 0
              ? `, возвратов к вычету: ${balance.pendingReturnsCount}`
              : ''
          }`}
        />
      </dl>
      {balance.uncostedCount > 0 ? (
        <p className="mt-3 text-[12.5px] font-medium text-alert">
          Без цены цеха: {balance.uncostedCount} забранных заказов — в «Ещё не в актах» их нет.
        </p>
      ) : null}
      {balance.isFeeSet ? null : (
        <p className="mt-3 text-[12.5px] text-muted">
          Комиссия Новой Почты не указана: «Ещё не в актах» посчитано без неё.
        </p>
      )}
    </section>
  )
}

function Figure({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div>
      <dt className="text-[12px] font-semibold text-muted">{label}</dt>
      <dd className="mt-1 font-display text-[22px] font-bold text-ink">{value}</dd>
      <dd className="text-[12px] text-faint">{note}</dd>
    </div>
  )
}
