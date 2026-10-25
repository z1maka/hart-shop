import { AdSpendState } from '@/features/admin/model/ad-spend'
import type { AdSpendView } from '@/features/admin/queries/get-admin-earnings'
import { AdSpendDailyChart } from '@/features/admin/ui/AdSpendDailyChart'
import { StatCell } from '@/features/admin/ui/StatCell'
import { percent, wholeMoney } from '@/features/admin/ui/stats-format'

// The ads on their own: what Google Ads cost over the same days, read from
// Google Analytics. Never taken off the earnings above.
export function AdSpendPanel({ adSpend }: { readonly adSpend: AdSpendView }) {
  return (
    <section aria-labelledby="ads-title" className="grid gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="ads-title" className="font-display text-[16px] font-bold text-ink uppercase">
          Реклама Google Ads
        </h2>
        <p className="text-[12px] text-faint">Из Google Analytics, за те же дни</p>
      </div>
      <AdSpendBody adSpend={adSpend} />
    </section>
  )
}

function AdSpendBody({ adSpend }: { readonly adSpend: AdSpendView }) {
  if (adSpend.state === AdSpendState.NotConnected) {
    return <Notice tone="muted">Расходы появятся после подключения Google Analytics.</Notice>
  }
  if (adSpend.state === AdSpendState.Failed) {
    return (
      <Notice tone="alert">
        Google Analytics сейчас не ответил — обновите страницу через минуту.
      </Notice>
    )
  }

  return (
    <div className="overflow-hidden rounded-card border border-subtle bg-surface">
      <dl className="grid divide-y divide-subtle sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <StatCell label="Потрачено" value={wholeMoney(adSpend.totalCents)} />
        <StatCell
          label="На один заказ"
          value={adSpend.perOrderCents === null ? '—' : wholeMoney(adSpend.perOrderCents)}
          hint="Все заказы периода"
        />
        <StatCell label="Доля от выручки" value={percent(adSpend.shareOfRevenue)} />
      </dl>
      <div className="border-t border-subtle p-4 sm:p-5">
        <h3 className="mb-3 text-[14px] font-semibold text-ink">Расходы по дням, ₴</h3>
        <AdSpendDailyChart days={adSpend.days} />
        <p className="mt-2 text-[12px] text-faint">
          Сегодняшние расходы Google дописывает в течение дня.
        </p>
      </div>
    </div>
  )
}

function Notice({
  tone,
  children,
}: {
  readonly tone: 'muted' | 'alert'
  readonly children: string
}) {
  return (
    <p
      className={
        tone === 'alert'
          ? 'rounded-card border border-alert-edge bg-alert-soft px-4 py-3 text-[13px] font-medium text-alert'
          : 'rounded-card border border-subtle bg-surface px-4 py-3 text-[13px] text-muted'
      }
    >
      {children}
    </p>
  )
}
