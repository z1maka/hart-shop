import Link from 'next/link'
import { inputClassName } from '@/components/ui/Field'
import {
  getAdminEarnings,
  type AdminEarningsView,
} from '@/features/admin/queries/get-admin-earnings'
import { AdSpendPanel } from '@/features/admin/ui/AdSpendPanel'
import { EarningsSummary } from '@/features/admin/ui/EarningsSummary'
import { fullDay, shortDay } from '@/features/admin/ui/stats-format'
import { EarningsPreset } from '@/features/orders'
import { cn } from '@/lib/utils'

type EarningsBoardProps = {
  readonly searchParams: PageProps<'/admin/stats'>['searchParams']
}

type Period = AdminEarningsView['period']

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
    <div className="grid gap-7">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h1 className="font-display text-[19px] font-bold text-ink">Статистика</h1>
          <p className="mt-1 text-[13px] text-muted">
            {fullDay(view.period.from)} — {fullDay(view.period.to)} · заказы по дате оформления
          </p>
        </div>
        <PeriodPicker period={view.period} />
      </header>
      {areDatesIgnored ? (
        <p className="-mt-4 text-[12.5px] font-medium text-alert">
          Эти даты не подошли: нужен период не длиннее 366 дней. Показаны последние 30 дней.
        </p>
      ) : null}
      <EarningsSummary view={view} />
      <AdSpendPanel adSpend={view.adSpend} />
      <p className="text-[12px] leading-relaxed text-faint">
        Отменённые заказы и возвраты (отказ, посылку не забрали) не считаются. Цена цеха берётся на
        момент заказа: если её потом поменять в товаре, прошлые заказы не пересчитаются.
      </p>
    </div>
  )
}

function PeriodPicker({ period }: { readonly period: Period }) {
  return (
    <div className="grid w-full gap-2 sm:flex sm:w-auto sm:items-center">
      <nav
        aria-label="Период"
        className="grid grid-cols-2 gap-1 rounded-[10px] border border-subtle bg-surface p-1 sm:flex sm:rounded-pill"
      >
        {PRESET_LINKS.map((link) => (
          <Link
            key={link.preset}
            href={`${STATS_PATH}?period=${link.preset}`}
            aria-current={period.preset === link.preset ? 'page' : undefined}
            className={cn(
              'rounded-pill px-3.5 py-1.5 text-center text-[13px] font-semibold text-muted transition-colors hover:text-ink',
              period.preset === link.preset && 'bg-ink text-on-dark hover:text-on-dark',
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <CustomDates period={period} />
    </div>
  )
}

// The admin's own dates behind one button: a plain GET form, so the chosen
// period stays in the address and survives a reload.
function CustomDates({ period }: { readonly period: Period }) {
  const isCustom = period.preset === null

  return (
    <details className="relative">
      <summary
        className={cn(
          'flex min-h-10 cursor-pointer list-none items-center justify-center rounded-pill border px-4 text-[13px] font-semibold transition-colors [&::-webkit-details-marker]:hidden',
          isCustom
            ? 'border-ink bg-ink text-on-dark'
            : 'border-subtle bg-surface text-muted hover:text-ink',
        )}
      >
        {isCustom ? `${shortDay(period.from)} — ${shortDay(period.to)}` : 'Свои даты'}
      </summary>
      <form
        action={STATS_PATH}
        className="absolute left-0 z-20 mt-2 grid w-[min(300px,calc(100vw-32px))] gap-3 rounded-card border border-subtle bg-raised p-4 shadow-card sm:right-0 sm:left-auto"
      >
        <div className="grid grid-cols-2 gap-2">
          <DateInput label="С" name="from" value={period.from} />
          <DateInput label="По" name="to" value={period.to} />
        </div>
        <button
          type="submit"
          className="min-h-11 rounded-control bg-ink px-4 text-[13px] font-semibold text-on-dark hover:bg-ink-hover"
        >
          Показать
        </button>
      </form>
    </details>
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
      <input
        type="date"
        name={name}
        defaultValue={value}
        required
        className={cn(inputClassName, 'px-2')}
      />
    </label>
  )
}
