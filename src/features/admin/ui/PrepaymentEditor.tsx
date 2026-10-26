'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { setOrderPrepaymentAction } from '@/features/admin/actions/order-actions'
import { prepaidInput, typedPrepaidCents } from '@/features/admin/model/prepayment-input'
import { kopiykasToHryvnias } from '@/features/admin/model/product-form'
import { errorText } from '@/features/admin/ui/messages'
import {
  moneyText,
  NoticeLine,
  PrepaymentField,
  Row,
  type Notice,
} from '@/features/admin/ui/waybill-form-parts'
import type { WaybillPaymentView } from '@/features/orders'
import { codCents } from '@/features/orders/model/shipment'
import { Button } from '@/components/ui/Button'

// The update reaches the carrier first: after a lost answer the admin looks
// at the waybill before saving again.
const NO_ANSWER_TEXT =
  'Нет ответа от сервера. Обновите страницу и проверьте сумму контроля оплаты в ТТН.'

type PrepaymentEditorProps = {
  readonly orderId: string
  readonly payment: WaybillPaymentView
}

// Money the buyer sent ahead after the waybill was written: the waybill is
// changed so that the branch collects only the rest.
export function PrepaymentEditor({ orderId, payment }: PrepaymentEditorProps) {
  const router = useRouter()
  const [prepaid, setPrepaid] = useState(prepaidInput(payment.prepaidCents))
  const [notice, setNotice] = useState<Notice | null>(null)
  const [isPending, startTransition] = useTransition()

  const prepaidCents = typedPrepaidCents(prepaid, payment.totalCents)
  const canSave = prepaidCents !== null && prepaidCents !== payment.prepaidCents

  function save() {
    if (prepaidCents === null) return
    setNotice(null)
    startTransition(async () => {
      const result = await setOrderPrepaymentAction({
        orderId,
        prepaidHryvnias: kopiykasToHryvnias(prepaidCents),
      }).catch(() => null)
      if (!result) {
        setNotice({ text: NO_ANSWER_TEXT, isError: true })
        return
      }
      if (!result.ok) {
        setNotice({ text: errorText(result.error), isError: true })
        return
      }
      setNotice({ text: savedText(codCents({ ...payment, prepaidCents })), isError: false })
      router.refresh()
    })
  }

  return (
    <div className="mt-4 grid gap-2.5 border-t border-subtle pt-4">
      <PrepaymentField value={prepaid} totalCents={payment.totalCents} onChange={setPrepaid} />
      <dl className="grid gap-1 text-[13px]">
        <Row
          label="Контроль оплаты в ТТН"
          value={moneyText(
            codCents({ ...payment, prepaidCents: prepaidCents ?? payment.prepaidCents }),
          )}
        />
      </dl>
      <Button variant="secondary" disabled={isPending || !canSave} onClick={save}>
        {isPending ? 'Обновляем ТТН…' : 'Обновить сумму в ТТН'}
      </Button>
      <NoticeLine notice={notice} />
    </div>
  )
}

function savedText(cod: number): string {
  return `Контроль оплаты в ТТН теперь ${moneyText(cod)}. Если этикетка уже распечатана — распечатайте её заново.`
}
