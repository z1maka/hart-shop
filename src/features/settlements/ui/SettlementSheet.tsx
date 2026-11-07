import type { SettlementDocumentView } from '@/features/settlements/queries/get-settlement-document'
import { cn } from '@/lib/utils'

// The act as the workshop gets it: one row per order — the order, what was
// in it, the waybill and what the workshop owes for it — and the total.
export function SettlementSheet({ settlement }: { readonly settlement: SettlementDocumentView }) {
  return (
    <article className="mx-auto w-full max-w-[210mm] bg-white p-8 text-[12.5px] text-black shadow-float print:max-w-none print:p-0 print:shadow-none">
      <header className="mb-5">
        <h1 className="text-[18px] font-bold">Акт расчёта с цехом № {settlement.number}</h1>
        <p className="mt-1">
          Посылки забраны: {settlement.periodLabel} · составлен {settlement.createdOnLabel}
        </p>
        <p className="mt-0.5 text-[11.5px] text-neutral-600">
          Сумма по заказу: цена продажи − цена цеха − комиссия Новой Почты за наложенный платёж (
          {settlement.feeLabel}). Возврат после расчёта вычитается разницей заказа.
        </p>
      </header>

      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-y border-black">
            <th className="w-8 py-1.5 pr-2 font-semibold">№</th>
            <th className="py-1.5 pr-2 font-semibold">Заказ</th>
            <th className="py-1.5 pr-2 font-semibold">Наименование</th>
            <th className="py-1.5 pr-2 font-semibold">ТТН</th>
            <th className="py-1.5 text-right font-semibold">Сумма</th>
          </tr>
        </thead>
        <tbody>
          {settlement.lines.map((line, index) => (
            <tr
              key={`${line.orderNumber}:${line.isReturn}`}
              className="border-b border-neutral-300 align-top"
            >
              <td className="py-1.5 pr-2">{index + 1}</td>
              <td className="py-1.5 pr-2 whitespace-nowrap">
                {line.orderNumber}
                {line.isReturn ? <span className="block text-[11px]">возврат</span> : null}
              </td>
              <td className="py-1.5 pr-2">{line.itemsLabel}</td>
              <td className="py-1.5 pr-2 whitespace-nowrap">{line.trackingNumber ?? '—'}</td>
              <td className={cn('py-1.5 text-right whitespace-nowrap', line.isReturn && 'italic')}>
                {line.amountLabel}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-black">
            <td colSpan={4} className="pt-2 pr-2 font-bold">
              Итого цех должен магазину · заказов: {settlement.saleCount}
              {settlement.returnCount > 0 ? `, возвратов: ${settlement.returnCount}` : ''}
            </td>
            <td className="pt-2 text-right font-bold whitespace-nowrap">{settlement.totalLabel}</td>
          </tr>
        </tfoot>
      </table>

      {settlement.isPaid ? (
        <p className="mt-5 font-semibold">Оплачено цехом {settlement.paidOnLabel}.</p>
      ) : null}
    </article>
  )
}
