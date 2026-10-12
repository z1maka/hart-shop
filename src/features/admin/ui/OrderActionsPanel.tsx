'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition, type ReactNode } from 'react'
import { Carrier, OrderStatus, PaymentRoute } from '@/db/enums'
import { CARRIER_NAMES } from '@/config/delivery'
import {
  saveOrderInvoiceAction,
  saveOrderTrackingAction,
  updateOrderStatusAction,
} from '@/features/admin/actions/order-actions'
import type { StatusChangeOutcome } from '@/features/orders/services/order-admin-service'
import { orderStatusLabel } from '@/features/admin/ui/order-status'
import type { TransferAccountView } from '@/features/orders'
import { errorText } from '@/features/admin/ui/messages'
import { Button } from '@/components/ui/Button'
import { inputClassName } from '@/components/ui/Field'
import { cn } from '@/lib/utils'

type OrderActionsPanelProps = {
  readonly orderId: string
  readonly status: OrderStatus
  readonly allowedNextStatuses: readonly OrderStatus[]
  readonly carrier: Carrier | null
  readonly trackingNumber: string | null
  readonly invoiceNumber: string | null
  readonly transferAccount: TransferAccountView | null
  readonly paymentRoute: PaymentRoute
  // The number came with a waybill issued here and is managed by it.
  readonly isTrackingFromWaybill: boolean
}

const selectClass = cn(inputClassName, 'font-normal')

export function OrderActionsPanel({
  orderId,
  status,
  allowedNextStatuses,
  carrier,
  trackingNumber,
  invoiceNumber,
  transferAccount,
  paymentRoute,
  isTrackingFromWaybill,
}: OrderActionsPanelProps) {
  const router = useRouter()
  const [nextStatus, setNextStatus] = useState<OrderStatus | ''>('')
  // Nova Poshta is the only carrier, and without one no tracking link forms.
  const [carrierValue, setCarrierValue] = useState<Carrier | ''>(carrier ?? Carrier.NovaPost)
  const [trackingNumberValue, setTrackingNumberValue] = useState(trackingNumber ?? '')
  // A number typed in earlier keeps the form open; otherwise it stays folded,
  // since waybills are normally issued from the panel above.
  const [isManualTrackingOpen, setIsManualTrackingOpen] = useState(trackingNumber !== null)
  const [invoiceValue, setInvoiceValue] = useState(invoiceNumber ?? '')
  const [notice, setNotice] = useState<{ text: string; isError: boolean } | null>(null)
  const [isPending, startTransition] = useTransition()

  function run(work: () => Promise<{ ok: boolean; error?: { code: string; message: string } }>) {
    setNotice(null)
    startTransition(async () => {
      const result = await work()

      if (!result.ok && result.error) {
        setNotice({ text: errorText(result.error), isError: true })
        return
      }

      setNotice({ text: 'Сохранено.', isError: false })
      router.refresh()
    })
  }

  function changeStatus(next: OrderStatus) {
    setNotice(null)
    startTransition(async () => {
      const result = await updateOrderStatusAction({ orderId, status: next })

      if (!result.ok) {
        setNotice({ text: errorText(result.error), isError: true })
        return
      }

      setNotice(statusChangeNotice(result.data))

      router.refresh()
    })
  }

  return (
    <div className="grid gap-4">
      <section className="rounded-card border border-subtle bg-surface p-5">
        <h2 className="mb-1 text-[14px] font-semibold text-ink">Статус</h2>
        <p className="mb-3 text-[12.5px] leading-relaxed text-muted">
          Сейчас: {orderStatusLabel(status, paymentRoute)}.
          {allowedNextStatuses.length === 0 ? ' Это конечный статус.' : ''}
        </p>

        {allowedNextStatuses.length > 0 ? (
          <div className="flex flex-wrap gap-2.5">
            <select
              value={nextStatus}
              onChange={(event) => setNextStatus(event.target.value as OrderStatus)}
              className={cn(selectClass, 'min-w-52 flex-1')}
            >
              <option value="">Выберите новый статус…</option>
              {allowedNextStatuses.map((entry) => (
                <option key={entry} value={entry}>
                  {orderStatusLabel(entry, paymentRoute)}
                </option>
              ))}
            </select>
            <Button
              disabled={isPending || nextStatus === ''}
              onClick={() => nextStatus !== '' && changeStatus(nextStatus)}
            >
              {isPending ? 'Сохраняем…' : 'Сменить статус'}
            </Button>
          </div>
        ) : null}

        {paymentRoute === PaymentRoute.BankTransfer && status === OrderStatus.Pending ? (
          <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
            Заказ по счёту: когда деньги придут на счёт, переведите его в «Оплачен» — дата платежа
            запишется автоматически.
          </p>
        ) : null}
        {paymentRoute === PaymentRoute.CashOnDelivery ? (
          <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
            Наложенный платёж: деньги собирает Нова Пошта при вручении. Заказ отметится оплаченным
            автоматически при переводе в «Доставлен».
          </p>
        ) : null}
      </section>

      {isTrackingFromWaybill ? null : (
        <ManualTracking isOpen={isManualTrackingOpen} onOpen={() => setIsManualTrackingOpen(true)}>
          <div className="grid gap-3">
            <label className="flex flex-col gap-1.5 text-[12.5px] font-semibold text-muted">
              Перевозчик
              <select
                value={carrierValue}
                onChange={(event) => setCarrierValue(event.target.value as Carrier | '')}
                className={selectClass}
              >
                <option value="">Не выбран</option>
                {Object.values(Carrier).map((entry) => (
                  <option key={entry} value={entry}>
                    {CARRIER_NAMES[entry]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-[12.5px] font-semibold text-muted">
              Номер ТТН
              <input
                value={trackingNumberValue}
                onChange={(event) => setTrackingNumberValue(event.target.value)}
                maxLength={120}
                placeholder="20450000000000"
                className={selectClass}
              />
            </label>
            <Button
              variant="secondary"
              disabled={isPending}
              onClick={() =>
                run(() =>
                  saveOrderTrackingAction({
                    orderId,
                    carrier: carrierValue === '' ? null : carrierValue,
                    trackingNumber: trackingNumberValue,
                    // Built from the number on the server for a known carrier.
                    trackingUrl: '',
                  }),
                )
              }
            >
              {isPending ? 'Сохраняем…' : 'Сохранить номер'}
            </Button>
          </div>
        </ManualTracking>
      )}

      {paymentRoute === PaymentRoute.BankTransfer ? (
        <section className="rounded-card border border-subtle bg-surface p-5">
          <h2 className="mb-3 text-[14px] font-semibold text-ink">Счёт</h2>
          {transferAccount ? <TransferAccountLine account={transferAccount} /> : null}
          <div className="grid gap-3">
            <label className="flex flex-col gap-1.5 text-[12.5px] font-semibold text-muted">
              Номер счёта, выставленного покупателю
              <input
                value={invoiceValue}
                onChange={(event) => setInvoiceValue(event.target.value)}
                maxLength={80}
                placeholder="INV-2026-001"
                className={selectClass}
              />
            </label>
            <Button
              variant="secondary"
              disabled={isPending}
              onClick={() =>
                run(() => saveOrderInvoiceAction({ orderId, invoiceNumber: invoiceValue }))
              }
            >
              {isPending ? 'Сохраняем…' : 'Сохранить номер счёта'}
            </Button>
          </div>
        </section>
      ) : null}

      {notice ? (
        <p
          className={cn(
            'text-[13px] font-medium',
            notice.isError ? 'text-alert' : 'text-accent-hover',
          )}
        >
          {notice.text}
        </p>
      ) : null}
    </div>
  )
}

type ManualTrackingProps = {
  readonly isOpen: boolean
  readonly onOpen: () => void
  readonly children: ReactNode
}

// For a waybill made in the Nova Poshta cabinet by hand — rare now that the
// panel above issues both branch and courier waybills.
function ManualTracking({ isOpen, onOpen, children }: ManualTrackingProps) {
  // A card of its own, like the panels around it: as a quiet outline button
  // it disappeared on the page and its one long line broke in the middle.
  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center justify-between gap-3 rounded-card border border-strong bg-surface px-5 py-4 text-left transition-colors hover:border-faint"
      >
        <span className="min-w-0">
          <span className="block text-[14px] font-semibold text-ink">Внести номер ТТН</span>
          <span className="mt-0.5 block text-[12.5px] leading-snug text-muted">
            Если накладную создали в кабинете Новой Почты вручную
          </span>
        </span>
        <span
          aria-hidden="true"
          className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-[18px] leading-none font-semibold text-white"
        >
          +
        </span>
      </button>
    )
  }

  return (
    <section className="rounded-card border border-subtle bg-surface p-5">
      <h2 className="mb-1 text-[14px] font-semibold text-ink">ТТН из кабинета</h2>
      <p className="mb-3 text-[12.5px] leading-relaxed text-muted">
        Номер накладной, созданной в кабинете Новой Почты вручную. Ссылка на отслеживание
        сформируется сама.
      </p>
      {children}
    </section>
  )
}

// The account to watch for the money. An order placed before accounts were
// kept on it follows whichever account is active, and says so.
function TransferAccountLine({ account }: { readonly account: TransferAccountView }) {
  return (
    <p className="mb-3 text-[12.5px] leading-relaxed text-muted">
      {account.isFixed
        ? 'Покупателю показан счёт: '
        : 'Заказ оформлен до того, как счёт стали сохранять в заказе, — покупатель видит активный: '}
      <span className="font-semibold text-ink">{account.label}</span>
    </p>
  )
}

// What went to the buyer with the new status: the mail with the tracking
// link, the SMS with the waybill number, both, or neither.
function statusChangeNotice(outcome: StatusChangeOutcome): { text: string; isError: boolean } {
  const failed = [outcome.mailSent === false && 'письмо', outcome.smsSent === false && 'SMS'].filter(
    (channel): channel is string => typeof channel === 'string',
  )
  if (failed.length > 0) {
    return {
      text: `Статус сохранён, но покупателю не удалось отправить: ${failed.join(' и ')} — проверьте сервис.`,
      isError: true,
    }
  }

  const sent = [
    outcome.mailSent === true && 'письмо с трек-номером',
    outcome.smsSent === true && 'SMS с ТТН',
  ].filter((channel): channel is string => typeof channel === 'string')
  return {
    text: sent.length > 0 ? `Сохранено. Покупателю ушло: ${sent.join(' и ')}.` : 'Сохранено.',
    isError: false,
  }
}
