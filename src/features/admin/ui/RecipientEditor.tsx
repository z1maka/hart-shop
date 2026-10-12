'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { settleOrderRecipientAction } from '@/features/admin/actions/order-actions'
import { AdminPointPicker, Chosen, type PointChoice } from '@/features/admin/ui/AdminPointPicker'
import { errorText } from '@/features/admin/ui/messages'
import type { PreviousRecipient, RecipientDraft } from '@/features/orders'
import { Button } from '@/components/ui/Button'
import { inputClassName } from '@/components/ui/Field'
import { isUaPhoneComplete, maskUaPhone, UaPhoneField } from '@/components/ui/UaPhoneField'
import { cn } from '@/lib/utils'

// Matches the admin action's limit for either part of the name.
const NAME_MAX_LENGTH = 60

type RecipientEditorProps = {
  readonly orderId: string
  readonly draft: RecipientDraft
  readonly buyerPointLabel: string | null
  // This phone's previous order, offered to fill the form in one click.
  readonly previous?: PreviousRecipient | null
  readonly parcelWeightGrams: number
  // Given when the editor is opened on demand: closes it after a save, and
  // offers a way out without saving.
  readonly onDone?: () => void
}

// After the consultant's call: who collects the parcel and at which branch
// or locker. Saved onto the order, after which the waybill form appears.
export function RecipientEditor({
  orderId,
  draft,
  buyerPointLabel,
  previous = null,
  parcelWeightGrams,
  onDone,
}: RecipientEditorProps) {
  const router = useRouter()
  const [firstName, setFirstName] = useState(draft.firstName)
  const [lastName, setLastName] = useState(draft.lastName)
  const [phone, setPhone] = useState(maskUaPhone(draft.phone))
  const [choice, setChoice] = useState<PointChoice | null>(null)
  // A point taken from the previous order has no city picked in the picker,
  // so it is shown on its own until the admin asks to change it.
  const [isChoiceFromPrevious, setIsChoiceFromPrevious] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isComplete =
    firstName.trim() !== '' && lastName.trim() !== '' && isUaPhoneComplete(phone) && choice !== null

  function applyPrevious(entry: PreviousRecipient) {
    setFirstName(entry.firstName)
    setLastName(entry.lastName)
    setChoice({
      kind: entry.kind,
      pointRef: entry.pointRef,
      pointName: entry.pointName,
      settlementName: entry.settlementName,
    })
    setIsChoiceFromPrevious(true)
  }

  function clearPreviousChoice() {
    setChoice(null)
    setIsChoiceFromPrevious(false)
  }

  function save() {
    if (!choice) return
    setNotice(null)
    startTransition(async () => {
      const result = await settleOrderRecipientAction({
        orderId,
        firstName,
        lastName,
        phone,
        kind: choice.kind,
        pointRef: choice.pointRef,
        settlementName: choice.settlementName,
      }).catch(() => null)

      if (!result) {
        setNotice('Нет ответа от сервера — обновите страницу.')
        return
      }
      if (!result.ok) {
        setNotice(errorText(result.error))
        return
      }
      onDone?.()
      router.refresh()
    })
  }

  return (
    <div className="grid gap-3 border-t border-subtle pt-3">
      <p className="text-[13px] font-semibold text-ink">Получатель и отделение</p>
      {previous && !isChoiceFromPrevious ? (
        <PreviousOffer previous={previous} onUse={() => applyPrevious(previous)} />
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <NameField label="Имя" value={firstName} onChange={setFirstName} />
        <NameField label="Фамилия" value={lastName} onChange={setLastName} />
      </div>
      <UaPhoneField name="recipientPhone" label="Телефон" value={phone} onChange={setPhone} />
      {buyerPointLabel ? (
        <p className="text-[12.5px] leading-relaxed text-muted">
          Покупатель выбрал: «{buyerPointLabel}»
        </p>
      ) : null}
      {isChoiceFromPrevious && choice ? (
        <Chosen
          label={`${choice.pointName} · ${choice.settlementName}`}
          onChange={clearPreviousChoice}
        />
      ) : (
        <AdminPointPicker
          parcelWeightGrams={parcelWeightGrams}
          choice={choice}
          onChoose={setChoice}
        />
      )}
      <Button disabled={isPending || !isComplete} onClick={save}>
        {isPending ? 'Сохраняем…' : 'Сохранить получателя'}
      </Button>
      {onDone ? (
        <Button variant="quiet" disabled={isPending} onClick={onDone}>
          Отмена
        </Button>
      ) : null}
      {notice ? <p className="text-[13px] font-medium text-alert">{notice}</p> : null}
    </div>
  )
}

function PreviousOffer({
  previous,
  onUse,
}: {
  readonly previous: PreviousRecipient
  readonly onUse: () => void
}) {
  return (
    <div className="grid gap-2 rounded-control border border-subtle bg-raised px-3.5 py-3">
      <p className="text-[12.5px] leading-relaxed text-muted">
        Прошлый заказ с этого номера ({previous.orderNumber}):{' '}
        <span className="text-ink">
          {previous.firstName} {previous.lastName} · {previous.pointName} ·{' '}
          {previous.settlementName}
        </span>
      </p>
      <Button variant="secondary" onClick={onUse}>
        Подставить
      </Button>
    </div>
  )
}

type NameFieldProps = {
  readonly label: string
  readonly value: string
  readonly onChange: (value: string) => void
}

function NameField({ label, value, onChange }: NameFieldProps) {
  return (
    <label className="flex flex-col gap-1.5 text-[12.5px] font-semibold text-muted">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={NAME_MAX_LENGTH}
        className={cn(inputClassName, 'font-normal')}
      />
    </label>
  )
}
