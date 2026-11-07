import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Field, inputClassName } from '@/components/ui/Field'
import type { SettlementsBoardView } from '@/features/settlements/queries/get-settlements-board'
import { CodFeeForm } from '@/features/settlements/ui/CodFeeForm'
import { cn } from '@/lib/utils'

const SETTLEMENTS_PATH = '/admin/settlements/'

export function SettlementsBoard({ view }: { readonly view: SettlementsBoardView }) {
  return (
    <div className="grid gap-6">
      <header>
        <h1 className="font-display text-[19px] font-bold text-ink">Расчёты с цехом</h1>
        <p className="mt-1 max-w-[80ch] text-[13px] leading-relaxed text-muted">
          Все оплаты приходят на счёт цеха. По каждой забранной посылке цех должен магазину: цена
          продажи − цена цеха − комиссия Новой Почты за наложенный платёж. Акт собирается из
          забранных посылок, которые ещё не входили ни в один акт.
        </p>
      </header>

      <CodFeeForm fee={view.fee} />

      <section className="rounded-card border border-subtle bg-surface p-5">
        <h2 className="text-[14px] font-semibold text-ink">Новый акт</h2>
        <p className="mt-1 text-[12.5px] text-muted">
          Выберите дни, когда покупатели забрали посылки.
        </p>
        <form
          method="get"
          action={`${SETTLEMENTS_PATH}new/`}
          className="mt-3 flex flex-wrap items-end gap-3"
        >
          <Field label="С" className="w-44">
            <input
              type="date"
              name="from"
              required
              defaultValue={view.monthStart}
              max={view.today}
              className={inputClassName}
            />
          </Field>
          <Field label="По" className="w-44">
            <input
              type="date"
              name="to"
              required
              defaultValue={view.today}
              max={view.today}
              className={inputClassName}
            />
          </Field>
          <Button type="submit">Показать посылки</Button>
        </form>
      </section>

      <section className="grid gap-3">
        <h2 className="text-[14px] font-semibold text-ink">Акты</h2>
        {view.settlements.length === 0 ? (
          <p className="text-[13px] text-muted">Актов пока нет.</p>
        ) : (
          <div className="overflow-x-auto rounded-card border border-subtle bg-surface">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead className="border-b border-subtle text-[12px] text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">№</th>
                  <th className="px-4 py-2.5 font-semibold">Посылки забрали</th>
                  <th className="px-4 py-2.5 font-semibold">Заказов</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Цех должен</th>
                  <th className="px-4 py-2.5 font-semibold">Статус</th>
                </tr>
              </thead>
              <tbody>
                {view.settlements.map((settlement) => (
                  <tr key={settlement.id} className="border-b border-subtle last:border-b-0">
                    <td className="px-4 py-3 font-semibold">
                      <Link
                        href={`${SETTLEMENTS_PATH}${settlement.id}/`}
                        className="text-ink underline underline-offset-4"
                      >
                        Акт № {settlement.number}
                      </Link>
                      <span className="block text-[11.5px] font-normal text-faint">
                        от {settlement.createdOnLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink">{settlement.periodLabel}</td>
                    <td className="px-4 py-3 text-ink">{settlement.lineCount}</td>
                    <td className="px-4 py-3 text-right font-semibold text-ink">
                      {settlement.totalLabel}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex rounded-pill px-2.5 py-1 text-[11.5px] font-bold',
                          settlement.isPaid ? 'bg-sunken text-muted' : 'bg-accent text-ink',
                        )}
                      >
                        {settlement.isPaid ? `Оплачен ${settlement.paidOnLabel}` : 'Ждём оплату'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {view.olderLeftOut ? (
          <p className="text-[12.5px] text-muted">
            Показаны последние {view.olderLeftOut} актов, более старые есть в базе.
          </p>
        ) : null}
      </section>
    </div>
  )
}
