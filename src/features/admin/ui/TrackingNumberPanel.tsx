'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Carrier } from '@/db/enums'
import { CARRIER_NAMES } from '@/config/delivery'
import { saveOrderTrackingAction } from '@/features/admin/actions/order-actions'
import { errorText } from '@/features/admin/ui/messages'
import type { TrackingOutcome } from '@/features/orders/services/order-admin-service'
import { Button } from '@/components/ui/Button'
import { inputClassName } from '@/components/ui/Field'
import { cn } from '@/lib/utils'

type TrackingNumberPanelProps = {
  readonly orderId: string
  readonly carrier: Carrier | null
  readonly trackingNumber: string | null
  // A partner sends the number of the waybill they wrote themselves: on
  // their orders the card is the usual way, open from the start.
  readonly isPartnerOrder: boolean
}

type PanelCopy = {
  readonly title: string
  readonly hint: string
}

const STATUS_HINT =
  'Оплаченный заказ после сохранения станет «Упакован», а «Отправлен» и «Доставлен» поставит отслеживание посылки.'

const PARTNER_COPY: PanelCopy = {
  title: 'ТТН от партнёра',
  hint: `Номер накладной, которую партнёр создал в своём кабинете Новой Почты. ${STATUS_HINT}`,
}

const CABINET_COPY: PanelCopy = {
  title: 'ТТН из кабинета',
  hint: `Номер накладной, созданной в кабинете Новой Почты вручную. Ссылка на отслеживание сформируется сама. ${STATUS_HINT}`,
}

const selectClass = cn(inputClassName, 'font-normal')

export function TrackingNumberPanel({
  orderId,
  carrier,
  trackingNumber,
  isPartnerOrder,
}: TrackingNumberPanelProps) {
  // A number typed in earlier keeps the form open, and so does a partner
  // order; otherwise it stays folded, since waybills are normally issued
  // from the panel above.
  const [isOpen, setIsOpen] = useState(isPartnerOrder || trackingNumber !== null)

  if (!isOpen) return <FoldedCard onOpen={() => setIsOpen(true)} />

  return (
    <TrackingForm
      orderId={orderId}
      carrier={carrier}
      trackingNumber={trackingNumber}
      copy={isPartnerOrder ? PARTNER_COPY : CABINET_COPY}
    />
  )
}

type TrackingFormProps = {
  readonly orderId: string
  readonly carrier: Carrier | null
  readonly trackingNumber: string | null
  readonly copy: PanelCopy
}

function TrackingForm({ orderId, carrier, trackingNumber, copy }: TrackingFormProps) {
  const router = useRouter()
  // Nova Poshta is the only carrier, and without one no tracking link forms.
  const [carrierValue, setCarrierValue] = useState<Carrier | ''>(carrier ?? Carrier.NovaPost)
  const [numberValue, setNumberValue] = useState(trackingNumber ?? '')
  const [notice, setNotice] = useState<{ text: string; isError: boolean } | null>(null)
  const [isPending, startTransition] = useTransition()

  function save() {
    setNotice(null)
    startTransition(async () => {
      const result = await saveOrderTrackingAction({
        orderId,
        carrier: carrierValue === '' ? null : carrierValue,
        trackingNumber: numberValue,
        // Built from the number on the server for a known carrier.
        trackingUrl: '',
      })

      if (!result.ok) {
        setNotice({ text: errorText(result.error), isError: true })
        return
      }

      setNotice({ text: savedText(result.data), isError: false })
      router.refresh()
    })
  }

  return (
    <section className="rounded-card border border-subtle bg-surface p-5">
      <h2 className="mb-1 text-[14px] font-semibold text-ink">{copy.title}</h2>
      <p className="mb-3 text-[12.5px] leading-relaxed text-muted">{copy.hint}</p>
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
            value={numberValue}
            onChange={(event) => setNumberValue(event.target.value)}
            maxLength={120}
            inputMode="numeric"
            placeholder="20450000000000"
            className={selectClass}
          />
        </label>
        <Button variant="secondary" disabled={isPending} onClick={save}>
          {isPending ? 'Сохраняем…' : 'Сохранить номер'}
        </Button>
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
    </section>
  )
}

function savedText(outcome: TrackingOutcome): string {
  return outcome.isPacked
    ? 'Сохранено. Заказ упакован — «Отправлен» поставит отслеживание, когда Новая Почта примет посылку.'
    : 'Сохранено.'
}

// For a waybill made in the Nova Poshta cabinet by hand — rare now that the
// panel above issues both branch and courier waybills.
function FoldedCard({ onOpen }: { readonly onOpen: () => void }) {
  // A card of its own, like the panels around it: as a quiet outline button
  // it disappeared on the page and its one long line broke in the middle.
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
