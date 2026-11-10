'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { switchOrderPaymentAction } from '@/features/admin/actions/order-actions'
import { errorText } from '@/features/admin/ui/messages'
import { PaymentRoute } from '@/db/enums'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

type PaymentRouteSwitcherProps = {
  readonly orderId: string
  // The route the order moves to; the caller renders nothing when none.
  readonly target: PaymentRoute
}

const SWITCH_LABELS: Partial<Record<PaymentRoute, string>> = {
  [PaymentRoute.BankTransfer]: 'Перевести на оплату на счёт ФОП',
  [PaymentRoute.CashOnDelivery]: 'Перевести на наложенный платёж',
}

// What changes for the order, said before the admin confirms.
const SWITCH_NOTES: Partial<Record<PaymentRoute, string>> = {
  [PaymentRoute.BankTransfer]:
    'Заказ станет «Ожидает оплаты», в нём появятся реквизиты активного счёта, а наложенный платёж и предоплата уберутся. Дальше выставьте счёт и отправьте покупателю ссылку. Самому покупателю ничего не отправляется.',
  [PaymentRoute.CashOnDelivery]:
    'Реквизиты из заказа уберутся, выставленный счёт будет аннулирован. Посылку покупатель оплатит при получении. Самому покупателю ничего не отправляется.',
}

// A buyer who changed their mind about paying: cash on delivery to a
// transfer to the ФОП or back, while no money and no waybill have moved.
export function PaymentRouteSwitcher({ orderId, target }: PaymentRouteSwitcherProps) {
  const router = useRouter()
  const [isConfirming, setIsConfirming] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const label = SWITCH_LABELS[target] ?? ''

  function confirm() {
    setError(null)
    startTransition(async () => {
      const result = await switchOrderPaymentAction({ orderId, paymentRoute: target })
      setIsConfirming(false)
      if (!result.ok) {
        setError(errorText(result.error))
        return
      }
      const voided = result.data.voidedInvoiceNumber
      setNotice(
        voided ? `Способ оплаты изменён. Счёт № ${voided} аннулирован.` : 'Способ оплаты изменён.',
      )
      router.refresh()
    })
  }

  return (
    <div className="mt-3 grid gap-2">
      <div>
        <Button variant="secondary" size="sm" onClick={() => setIsConfirming(true)}>
          {label}
        </Button>
      </div>
      {notice ? <p className="text-[12.5px] text-ink">{notice}</p> : null}
      {error ? <p className="text-[12.5px] text-alert">{error}</p> : null}
      <ConfirmDialog
        isOpen={isConfirming}
        onOpenChange={setIsConfirming}
        title={`${label}?`}
        confirmLabel="Изменить"
        cancelLabel="Оставить как есть"
        isPending={isPending}
        onConfirm={confirm}
      >
        {SWITCH_NOTES[target]}
      </ConfirmDialog>
    </div>
  )
}
