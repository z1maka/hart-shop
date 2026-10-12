'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import {
  findAdminStreetsAction,
  issueCourierWaybillAction,
} from '@/features/admin/actions/order-actions'
import {
  Chosen,
  CitySearch,
  Options,
  SEARCH_DEBOUNCE_MS,
  SearchInput,
  settlementLabel,
} from '@/features/admin/ui/AdminPointPicker'
import { errorText } from '@/features/admin/ui/messages'
import { useLatestRequest } from '@/features/admin/ui/use-latest-request'
import { defaultSenderId, issueButtonLabel } from '@/features/admin/model/waybill-sender'
import { WaybillSenderPicker } from '@/features/admin/ui/WaybillSenderPicker'
import {
  initialWeightKg,
  issuedNotice,
  MoneyRows,
  NO_ANSWER_TEXT,
  NoticeLine,
  ParcelFields,
  Row,
  weightKgToGrams,
  type Notice,
} from '@/features/admin/ui/waybill-form-parts'
import type { AdminWaybillView } from '@/features/orders'
import type { Settlement, Street } from '@/features/shipping'
import { Button } from '@/components/ui/Button'
import { inputClassName } from '@/components/ui/Field'
import { isUaPhoneComplete, maskUaPhone, UaPhoneField } from '@/components/ui/UaPhoneField'
import { cn } from '@/lib/utils'

const MIN_STREET_SEARCH_LENGTH = 2
// Matches the admin action's limits.
const NAME_MAX_LENGTH = 60
const HOUSE_MAX_LENGTH = 20

type CourierWaybillFormProps = {
  readonly orderId: string
  readonly waybill: AdminWaybillView
}

// A courier order's waybill: the buyer typed the address as free text, so
// the admin confirms it against the carrier's own city and street directory.
export function CourierWaybillForm({ orderId, waybill }: CourierWaybillFormProps) {
  const router = useRouter()
  const [firstName, setFirstName] = useState(waybill.recipient.firstName)
  const [lastName, setLastName] = useState(waybill.recipient.lastName)
  const [phone, setPhone] = useState(maskUaPhone(waybill.recipient.phone))
  const [settlement, setSettlement] = useState<Settlement | null>(null)
  const [street, setStreet] = useState<Street | null>(null)
  const [house, setHouse] = useState('')
  const [flat, setFlat] = useState('')
  const [weightKg, setWeightKg] = useState(initialWeightKg(waybill.weightGrams))
  const [description, setDescription] = useState(waybill.description)
  const [senderId, setSenderId] = useState(defaultSenderId(waybill.senders))
  const [notice, setNotice] = useState<Notice | null>(null)
  const [isPending, startTransition] = useTransition()

  const isComplete =
    [firstName, lastName, house, weightKg, description].every((value) => value.trim() !== '') &&
    isUaPhoneComplete(phone) &&
    settlement !== null &&
    street !== null

  function issue() {
    if (!settlement || !street) return
    setNotice(null)
    startTransition(async () => {
      const result = await issueCourierWaybillAction({
        orderId,
        weightGrams: weightKgToGrams(weightKg),
        cargoDescription: description,
        firstName,
        lastName,
        phone,
        cityRef: settlement.ref,
        cityName: settlement.name,
        streetRef: street.ref,
        streetName: street.name,
        house,
        flat,
        carrierAccountId: senderId,
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
      <p className="text-[12.5px] leading-relaxed text-muted">
        Курьер на адрес. Покупатель указал: «{waybill.buyerAddress ?? '—'}». Найдите город и улицу в
        справочнике Новой Почты.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Имя"
          value={firstName}
          maxLength={NAME_MAX_LENGTH}
          onChange={setFirstName}
        />
        <TextField
          label="Фамилия"
          value={lastName}
          maxLength={NAME_MAX_LENGTH}
          onChange={setLastName}
        />
      </div>
      <UaPhoneField name="courierPhone" label="Телефон" value={phone} onChange={setPhone} />
      {settlement ? (
        <Chosen
          label={settlementLabel(settlement)}
          onChange={() => {
            setSettlement(null)
            setStreet(null)
          }}
        />
      ) : (
        <CitySearch onChoose={setSettlement} />
      )}
      {settlement ? (
        <StreetField settlementRef={settlement.ref} street={street} onChoose={setStreet} />
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Дом" value={house} maxLength={HOUSE_MAX_LENGTH} onChange={setHouse} />
        <TextField label="Квартира" value={flat} maxLength={HOUSE_MAX_LENGTH} onChange={setFlat} />
      </div>
      <ParcelFields
        weightKg={weightKg}
        description={description}
        hasProductWeight={waybill.weightGrams > 0}
        onWeightKg={setWeightKg}
        onDescription={setDescription}
      />
      <dl className="grid gap-1 text-[13px]">
        {waybill.senderBranchLabel ? (
          <Row label="Откуда" value={waybill.senderBranchLabel} />
        ) : null}
        <Row label="Доставка" value="курьером до двери" />
        <MoneyRows waybill={waybill} />
      </dl>
      <Button disabled={isPending || !isComplete} onClick={issue}>
        {isPending ? 'Создаём…' : issueButtonLabel(waybill.senders, senderId)}
      </Button>
      <NoticeLine notice={notice} />
    </div>
  )
}

type StreetFieldProps = {
  readonly settlementRef: string
  readonly street: Street | null
  readonly onChoose: (street: Street | null) => void
}

function StreetField({ settlementRef, street, onChoose }: StreetFieldProps) {
  const [search, setSearch] = useState('')
  const [streets, setStreets] = useState<readonly Street[]>([])
  const [notice, setNotice] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const beginRequest = useLatestRequest()

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  function searchStreets(value: string) {
    setSearch(value)
    if (timer.current) clearTimeout(timer.current)
    const isLatest = beginRequest()
    if (value.trim().length < MIN_STREET_SEARCH_LENGTH) {
      setStreets([])
      setNotice(null)
      return
    }

    timer.current = setTimeout(() => {
      startTransition(async () => {
        const result = await findAdminStreetsAction({ settlementRef, search: value }).catch(
          () => null,
        )
        if (!isLatest()) return
        if (!result?.ok) {
          setNotice(result ? errorText(result.error) : 'Нет ответа от сервера.')
          setStreets([])
          return
        }
        setNotice(result.data.length === 0 ? 'Такой улицы в справочнике нет.' : null)
        setStreets(result.data)
      })
    }, SEARCH_DEBOUNCE_MS)
  }

  if (street) return <Chosen label={street.name} onChange={() => onChoose(null)} />

  return (
    <div className="grid gap-2">
      <SearchInput
        label="Улица"
        value={search}
        placeholder="Название улицы"
        isBusy={isPending}
        onChange={searchStreets}
      />
      <Options
        entries={streets.map((entry) => ({
          key: entry.ref,
          title: entry.name,
          hint: null,
          onPick: () => onChoose(entry),
        }))}
      />
      {notice && !isPending ? <p className="text-[12.5px] text-muted">{notice}</p> : null}
    </div>
  )
}

type TextFieldProps = {
  readonly label: string
  readonly value: string
  readonly maxLength: number
  readonly onChange: (value: string) => void
}

function TextField({ label, value, maxLength, onChange }: TextFieldProps) {
  return (
    <label className="flex flex-col gap-1.5 text-[12.5px] font-semibold text-muted">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={maxLength}
        className={cn(inputClassName, 'font-normal')}
      />
    </label>
  )
}
