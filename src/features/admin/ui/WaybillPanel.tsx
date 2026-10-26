'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { issueWaybillAction, removeWaybillAction } from '@/features/admin/actions/order-actions'
import { CourierWaybillForm } from '@/features/admin/ui/CourierWaybillForm'
import { errorText } from '@/features/admin/ui/messages'
import { PrepaymentEditor } from '@/features/admin/ui/PrepaymentEditor'
import { RecipientEditor } from '@/features/admin/ui/RecipientEditor'
import {
  defaultSenderId,
  issueButtonLabel,
  senderLine,
} from '@/features/admin/model/waybill-sender'
import { prepaidInput, typedPrepaidCents } from '@/features/admin/model/prepayment-input'
import { kopiykasToHryvnias } from '@/features/admin/model/product-form'
import { WaybillSenderPicker } from '@/features/admin/ui/WaybillSenderPicker'
import {
  initialWeightKg,
  issuedNotice,
  MoneyRows,
  NO_ANSWER_TEXT,
  NoticeLine,
  ParcelFields,
  PrepaymentField,
  Row,
  weightKgToGrams,
  type Notice,
} from '@/features/admin/ui/waybill-form-parts'
import type { AdminWaybillView, WaybillBlocker, WaybillSenderView } from '@/features/orders'
import { Button } from '@/components/ui/Button'

const BLOCKER_TEXT: Record<WaybillBlocker, string> = {
  quick_order:
    'Быстрый заказ: после звонка укажите получателя и отделение — затем появится кнопка «Создать ТТН».',
  manual_point:
    'Отделение покупатель ввёл вручную, когда справочник не работал. Найдите его ниже и сохраните.',
  unknown_point:
    'Отделения из заказа нет в справочнике: заказ оформлен до обновления справочника или отделение закрылось. Выберите его заново ниже.',
  recipient: 'Укажите имя, фамилию и украинский номер получателя, затем отделение.',
  status: 'Заказ уже отправлен или отменён — новая накладная ему не нужна.',
  not_configured: 'Создание накладных не настроено: нет данных отправителя.',
}

type WaybillPanelProps = {
  readonly orderId: string
  readonly waybill: AdminWaybillView
  readonly trackingNumber: string | null
  readonly trackingUrl: string | null
}

export function WaybillPanel(props: WaybillPanelProps) {
  return (
    <section className="rounded-card border border-subtle bg-surface p-5">
      <h2 className="mb-3 text-[14px] font-semibold text-ink">Накладная Новой Почты</h2>
      <WaybillBody {...props} />
      {props.waybill.documentRef && props.waybill.payment.isPrepaymentOpen ? (
        <PrepaymentEditor orderId={props.orderId} payment={props.waybill.payment} />
      ) : null}
    </section>
  )
}

function WaybillBody({ orderId, waybill, trackingNumber, trackingUrl }: WaybillPanelProps) {
  if (waybill.documentRef) {
    return (
      <IssuedWaybill
        orderId={orderId}
        number={trackingNumber}
        trackingUrl={trackingUrl}
        canRemove={waybill.canRemove}
        issuedFrom={waybill.issuedFrom}
        branchLabel={waybill.senderBranchLabel}
      />
    )
  }
  if (waybill.blocker) {
    return (
      <div className="grid gap-3">
        <p className="text-[12.5px] leading-relaxed text-muted">{BLOCKER_TEXT[waybill.blocker]}</p>
        {waybill.mustSettleRecipient ? (
          <RecipientEditor
            orderId={orderId}
            draft={waybill.recipient}
            buyerPointLabel={waybill.buyerPointLabel}
            current={waybill.currentPoint}
            previous={waybill.previousRecipient}
            parcelWeightGrams={waybill.weightGrams}
          />
        ) : null}
      </div>
    )
  }
  if (waybill.isCourier) return <CourierWaybillForm orderId={orderId} waybill={waybill} />
  return <IssueForm orderId={orderId} waybill={waybill} />
}

function IssuedWaybill({
  orderId,
  number,
  trackingUrl,
  canRemove,
  issuedFrom,
  branchLabel,
}: {
  readonly orderId: string
  readonly number: string | null
  readonly trackingUrl: string | null
  readonly canRemove: boolean
  readonly issuedFrom: WaybillSenderView | null
  readonly branchLabel: string | null
}) {
  const router = useRouter()
  const [notice, setNotice] = useState<Notice | null>(null)
  const [isPending, startTransition] = useTransition()

  function remove() {
    if (
      !window.confirm('Удалить накладную в Новой Почте? Номер отслеживания у заказа очистится.')
    ) {
      return
    }
    setNotice(null)
    startTransition(async () => {
      const result = await removeWaybillAction({ orderId }).catch(() => null)
      if (!result) {
        setNotice({ text: NO_ANSWER_TEXT, isError: true })
        return
      }
      if (!result.ok) {
        setNotice({ text: errorText(result.error), isError: true })
        return
      }
      setNotice({ text: 'Накладная удалена.', isError: false })
      router.refresh()
    })
  }

  return (
    <div className="grid gap-3">
      <div>
        <p className="text-[13.5px] text-ink">
          ТТН <strong>{number ?? '—'}</strong>
        </p>
        {issuedFrom ? (
          <p className="mt-0.5 text-[12.5px] text-muted">
            Отправитель: {senderLine(issuedFrom, branchLabel)}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2.5">
        <Button asChild>
          <a href={`/admin/orders/${orderId}/label/`} target="_blank" rel="noreferrer">
            Печать этикетки 100×100
          </a>
        </Button>
        {trackingUrl ? (
          <Button variant="secondary" asChild>
            <a href={trackingUrl} target="_blank" rel="noreferrer">
              Отслеживание
            </a>
          </Button>
        ) : null}
      </div>
      {canRemove ? (
        <Button variant="quiet" disabled={isPending} onClick={remove}>
          {isPending ? 'Удаляем…' : 'Удалить ТТН'}
        </Button>
      ) : null}
      <NoticeLine notice={notice} />
      {issuedFrom ? (
        <p className="text-[12px] leading-relaxed text-faint">
          Кабинет у накладной закреплён: печать, отслеживание и удаление идут его ключом. Чтобы
          сменить отправителя — удалите ТТН и создайте заново.
        </p>
      ) : null}
    </div>
  )
}

function IssueForm({
  orderId,
  waybill,
}: {
  readonly orderId: string
  readonly waybill: AdminWaybillView
}) {
  const router = useRouter()
  const [weightKg, setWeightKg] = useState(initialWeightKg(waybill.weightGrams))
  const [description, setDescription] = useState(waybill.description)
  const [senderId, setSenderId] = useState(defaultSenderId(waybill.senders))
  const [prepaid, setPrepaid] = useState(prepaidInput(waybill.payment.prepaidCents))
  const [isEditingRecipient, setIsEditingRecipient] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [isPending, startTransition] = useTransition()

  const { isPrepaymentOpen, totalCents } = waybill.payment
  const prepaidCents = isPrepaymentOpen ? typedPrepaidCents(prepaid, totalCents) : null
  const isPrepaidValid = !isPrepaymentOpen || prepaidCents !== null
  const isComplete = weightKg.trim() !== '' && description.trim() !== '' && isPrepaidValid

  function issue() {
    setNotice(null)
    startTransition(async () => {
      const result = await issueWaybillAction({
        orderId,
        weightGrams: weightKgToGrams(weightKg),
        cargoDescription: description,
        carrierAccountId: senderId,
        prepaidHryvnias: prepaidCents === null ? undefined : kopiykasToHryvnias(prepaidCents),
      }).catch(() => null)
      if (!result) {
        setNotice({ text: NO_ANSWER_TEXT, isError: true })
        return
      }
      if (!result.ok) {
        setNotice({ text: errorText(result.error), isError: true })
        return
      }
      setNotice(issuedNotice(result.data))
      router.refresh()
    })
  }

  return (
    <div className="grid gap-3">
      <WaybillSenderPicker
        senders={waybill.senders}
        branchLabel={waybill.senderBranchLabel}
        chosenId={senderId}
        onChoose={setSenderId}
      />
      <ParcelFields
        weightKg={weightKg}
        description={description}
        hasProductWeight={waybill.weightGrams > 0}
        onWeightKg={setWeightKg}
        onDescription={setDescription}
      />
      {isPrepaymentOpen ? (
        <PrepaymentField value={prepaid} totalCents={totalCents} onChange={setPrepaid} />
      ) : null}
      <IssueSummary waybill={waybill} prepaidCents={prepaidCents ?? waybill.payment.prepaidCents} />
      {isEditingRecipient ? (
        // No waybill for the old recipient while the new one is being typed.
        <RecipientEditor
          orderId={orderId}
          draft={waybill.recipient}
          buyerPointLabel={waybill.buyerPointLabel}
          current={waybill.currentPoint}
          parcelWeightGrams={waybill.weightGrams}
          onDone={() => setIsEditingRecipient(false)}
        />
      ) : (
        <>
          <Button disabled={isPending || !isComplete} onClick={issue}>
            {isPending ? 'Создаём…' : issueButtonLabel(waybill.senders, senderId)}
          </Button>
          <NoticeLine notice={notice} />
          <Button variant="quiet" onClick={() => setIsEditingRecipient(true)}>
            Изменить получателя или отделение
          </Button>
        </>
      )}
    </div>
  )
}

// Where the parcel goes from and to, and what the branch collects.
function IssueSummary({
  waybill,
  prepaidCents,
}: {
  readonly waybill: AdminWaybillView
  readonly prepaidCents: number
}) {
  return (
    <dl className="grid gap-1 text-[13px]">
      {waybill.senderBranchLabel ? <Row label="Откуда" value={waybill.senderBranchLabel} /> : null}
      <Row
        label="Получатель"
        value={`${waybill.recipient.firstName} ${waybill.recipient.lastName}`}
      />
      {waybill.buyerPointLabel ? <Row label="Куда" value={waybill.buyerPointLabel} /> : null}
      <MoneyRows payment={waybill.payment} prepaidCents={prepaidCents} />
    </dl>
  )
}
