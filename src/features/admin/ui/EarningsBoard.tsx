import Link from 'next/link'
import { inputClassName } from '@/components/ui/Field'
import { getAdminEarnings } from '@/features/admin/queries/get-admin-earnings'
import { EarningsChart } from '@/features/admin/ui/EarningsChart'
import { EarningsPreset, type EarningsTotalsView, type EarningsView } from '@/features/orders'
import { cn } from '@/lib/utils'

type EarningsBoardProps = {
  readonly searchParams: PageProps<'/admin/stats'>['searchParams']
}

const STATS_PATH = '/admin/stats/'

const PRESET_LINKS: readonly { preset: EarningsPreset; label: string }[] = [
  { preset: EarningsPreset.Week, label: '7 дней' },
  { preset: EarningsPreset.Days30, label: '30 дней' },
  { preset: EarningsPreset.ThisMonth, label: 'Этот месяц' },
  { preset: EarningsPreset.LastMonth, label: 'Прошлый месяц' },
]

function textParam(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined
}

export async function EarningsBoard({ searchParams }: EarningsBoardProps) {
  const params = await searchParams
  const from = textParam(params.from)
  const to = textParam(params.to)
  const view = await getAdminEarnings({ period: textParam(params.period), from, to })
  const areDatesIgnored = Boolean(from || to) && view.period.preset !== null

  return (
    <div className="grid gap-5">
      <h1 className="font-display text-[19px] font-bold text-ink">Статистика</h1>
      <PeriodPicker period={view.period} />
      {areDatesIgnored ? (
        <p className="text-[12.5px] font-medium text-alert">
          Эти даты не подошли: нужен период не длиннее 366 дней.
        </p>
      ) : null}
      <p className="text-[13px] text-muted">
        Заказы с {displayDate(view.period.from)} по {displayDate(view.period.to)}, по дате заказа.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <TotalsCard
          title="Фактический"
          subtitle="Посылки, которые покупатель уже забрал"
          totals={view.collected}
        />
        <TotalsCard
          title="Все заказы"
          subtitle="Включая ещё не забранные: в обработке и в пути"
          totals={view.all}
        />
      </div>

      <section className="rounded-card border border-subtle bg-surface p-5.5">
        <h2 className="mb-4 font-display text-[16px] font-bold text-ink">Заработок по дням</h2>
        <EarningsChart days={view.days} />
      </section>

      <p className="text-[12px] leading-relaxed text-muted">
        Заработок — цена продажи минус себестоимость товара на момент заказа. Отменённые заказы и
        возвраты (отказ или посылку не забрали) не считаются. Позиции без себестоимости входят в
        выручку, но не в заработок — впишите себестоимость в карточке товара.
      </p>
    </div>
  )
}

function PeriodPicker({ period }: { readonly period: EarningsView['period'] }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <nav className="grid grid-cols-2 gap-1 rounded-[10px] border border-subtle bg-surface p-1 sm:flex sm:rounded-pill">
        {PRESET_LINKS.map((link) => (
          <Link
            key={link.preset}
            href={`${STATS_PATH}?period=${link.preset}`}
            aria-current={period.preset === link.preset ? 'page' : undefined}
            className={cn(
              'rounded-pill px-3 py-1.5 text-center text-[13px] font-semibold text-muted transition-colors hover:text-ink',
              period.preset === link.preset && 'bg-ink text-on-dark hover:text-on-dark',
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      {/* A plain GET form: the chosen dates stay in the address. */}
      <form action={STATS_PATH} className="flex flex-wrap items-end gap-2">
        <DateInput label="С" name="from" value={period.from} />
        <DateInput label="По" name="to" value={period.to} />
        <button
          type="submit"
          className="min-h-11 rounded-control bg-ink px-4 text-[13px] font-semibold text-on-dark hover:bg-ink-hover"
        >
          Показать
        </button>
      </form>
    </div>
  )
}

function DateInput({
  label,
  name,
  value,
}: {
  readonly label: string
  readonly name: string
  readonly value: string
}) {
  return (
    <label className="grid gap-1 text-[12px] font-semibold text-muted">
      {label}
      <input type="date" name={name} defaultValue={value} required className={inputClassName} />
    </label>
  )
}

function TotalsCard({
  title,
  subtitle,
  totals,
}: {
  readonly title: string
  readonly subtitle: string
  readonly totals: EarningsTotalsView
}) {
  const rows: readonly [string, string | number][] = [
    ['Заказов', totals.orders],
    ['Позиций, шт.', totals.units],
    ['Выручка', totals.revenueLabel],
    ['Себестоимость', totals.costLabel],
    ['Маржа', totals.marginLabel],
  ]

  return (
    <section className="rounded-card border border-subtle bg-surface p-5.5">
      <h2 className="font-display text-[16px] font-bold text-ink">{title}</h2>
      <p className="mb-3 text-[12.5px] text-muted">{subtitle}</p>
      <p className="mb-3 font-display text-[26px] font-bold text-ink">{totals.earningsLabel}</p>
      <dl className="grid gap-1.5 text-[13px]">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3 border-t border-subtle pt-1.5">
            <dt className="text-muted">{label}</dt>
            <dd className="font-semibold text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      {totals.uncostedNote ? (
        <p className="mt-3 text-[12px] font-medium text-alert">{totals.uncostedNote}</p>
      ) : null}
    </section>
  )
}

function displayDate(day: string): string {
  return `${day.slice(8, 10)}.${day.slice(5, 7)}.${day.slice(0, 4)}`
}
