'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { SalesChannel } from '@/db/enums'
import { findOrderVariantsAction } from '@/features/admin/actions/order-actions'
import { createPartnerOrderAction } from '@/features/admin/actions/partner-order-actions'
import { addResellerAction } from '@/features/admin/actions/reseller-actions'
import type { ResellerView } from '@/features/admin/queries/get-resellers'
import { AdminPointPicker, type PointChoice } from '@/features/admin/ui/AdminPointPicker'
import { errorText } from '@/features/admin/ui/messages'
import {
  EMPTY_RESELLER,
  ResellerForm,
  type ResellerFormDraft,
} from '@/features/admin/ui/ResellerForm'
import { earnsNothingOver } from '@/features/catalog/model/pricing'
import type { AddableVariant } from '@/features/orders'
import {
  ORDER_LINE_MAX_QUANTITY,
  VARIANT_SEARCH_MIN_LENGTH,
} from '@/features/orders/model/order-edit'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Field, inputClassName } from '@/components/ui/Field'
import { createMoney, Currency, formatWholeMoney } from '@/lib/money'
import { cn } from '@/lib/utils'

// The partner's order as the admin builds it: a line keeps the variant as the
// picker found it, the quantity, and a price agreed apart from the card.
type DraftLine = {
  readonly variant: AddableVariant
  readonly dropPriceCents: number
  readonly quantity: number
  // Whole hryvnias as typed; null keeps the card's drop price.
  readonly agreedHryvnias: number | null
}

type Delivery = 'point' | 'courier'

type Courier = { readonly city: string; readonly line1: string; readonly line2: string }

const EMPTY_COURIER: Courier = { city: '', line1: '', line2: '' }
const KOPIYKAS_PER_HRYVNIA = 100

export function PartnerOrderForm({ resellers }: { readonly resellers: readonly ResellerView[] }) {
  const router = useRouter()
  const [resellerId, setResellerId] = useState(resellers.at(0)?.id ?? '')
  const [orderRef, setOrderRef] = useState('')
  const [lines, setLines] = useState<readonly DraftLine[]>([])
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [delivery, setDelivery] = useState<Delivery>('point')
  const [point, setPoint] = useState<PointChoice | null>(null)
  const [courier, setCourier] = useState<Courier>(EMPTY_COURIER)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submit() {
    setError(null)
    startTransition(async () => {
      const result = await createPartnerOrderAction({
        resellerId,
        resellerOrderRef: orderRef,
        fullName,
        phone,
        pickupPoint: delivery === 'point' ? pointInput(point) : null,
        courier: delivery === 'courier' ? courier : null,
        lines: lines.map((line) => ({
          variantId: line.variant.variantId,
          quantity: line.quantity,
          agreedPrice: line.agreedHryvnias,
        })),
      })
      if (!result.ok) {
        setError(errorText(result.error))
        return
      }
      router.push(`/admin/orders/${result.data}/`)
    })
  }

  const totals = orderTotals(lines)
  const parcelGrams = lines.reduce((sum, line) => sum + line.variant.weightGrams * line.quantity, 0)

  return (
    <div className="flex flex-wrap items-start gap-6">
      <div className="grid min-w-[min(100%,340px)] flex-[999_1_640px] gap-4">
        <PartnerSection
          resellers={resellers}
          resellerId={resellerId}
          onReseller={setResellerId}
          orderRef={orderRef}
          onOrderRef={setOrderRef}
        />
        <LinesSection lines={lines} onLines={setLines} />
        <section className="grid gap-3.5 rounded-card border border-subtle bg-surface p-5">
          <SectionTitle step="3" title="Получатель" note="обычно клиент партнёра" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="ПІБ">
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Прізвище Ім’я По батькові"
                maxLength={120}
                className={inputClassName}
              />
            </Field>
            <Field label="Телефон">
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+380"
                inputMode="tel"
                maxLength={32}
                className={inputClassName}
              />
            </Field>
          </div>
          <DeliveryToggle delivery={delivery} onDelivery={setDelivery} />
          {delivery === 'point' ? (
            <AdminPointPicker parcelWeightGrams={parcelGrams} choice={point} onChoose={setPoint} />
          ) : (
            <CourierFields courier={courier} onCourier={setCourier} />
          )}
        </section>
      </div>
      <SummaryCard
        totals={totals}
        error={error}
        isPending={isPending}
        isReady={lines.length > 0 && resellerId !== ''}
        onSubmit={submit}
      />
    </div>
  )
}

function SectionTitle({
  step,
  title,
  note,
  action,
}: {
  readonly step: string
  readonly title: string
  readonly note?: string
  readonly action?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-3">
      <h2 className="font-display text-[16px] font-bold text-ink">
        {step} · {title}
      </h2>
      {note ? <span className="text-[12px] text-faint">{note}</span> : null}
      {action}
    </div>
  )
}

function PartnerSection({
  resellers,
  resellerId,
  onReseller,
  orderRef,
  onOrderRef,
}: {
  readonly resellers: readonly ResellerView[]
  readonly resellerId: string
  readonly onReseller: (id: string) => void
  readonly orderRef: string
  readonly onOrderRef: (value: string) => void
}) {
  return (
    <section className="grid gap-3.5 rounded-card border border-subtle bg-surface p-5">
      <SectionTitle step="1" title="Партнёр" action={<NewResellerButton onAdded={onReseller} />} />
      <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Field label="Партнёр" className="min-w-0">
          <select
            value={resellerId}
            onChange={(event) => onReseller(event.target.value)}
            className={cn(inputClassName, 'w-full min-w-0')}
          >
            {resellers.length === 0 ? <option value="">Сначала добавьте партнёра</option> : null}
            {resellers.map((reseller) => (
              <option key={reseller.id} value={reseller.id}>
                {reseller.name} · {reseller.taxId}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Номер у партнёра">
          <input
            value={orderRef}
            onChange={(event) => onOrderRef(event.target.value)}
            placeholder="необязательно"
            maxLength={60}
            className={inputClassName}
          />
        </Field>
      </div>
    </section>
  )
}

// The same form as in the settings: a partner met over the phone is added
// without leaving the order.
function NewResellerButton({ onAdded }: { readonly onAdded: (id: string) => void }) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function add(draft: ResellerFormDraft) {
    setError(null)
    startTransition(async () => {
      const result = await addResellerAction(draft)
      if (!result.ok) {
        setError(errorText(result.error))
        return
      }
      setIsOpen(false)
      router.refresh()
      onAdded(result.data)
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="text-[12.5px] font-semibold text-accent-hover hover:underline"
      >
        + Добавить партнёра
      </button>
      <Dialog
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title="Новый партнёр"
        className="max-h-[92vh] w-[min(720px,94vw)] overflow-y-auto"
      >
        {isOpen ? (
          <ResellerForm
            initial={EMPTY_RESELLER}
            submitLabel="Добавить партнёра"
            isPending={isPending}
            error={error}
            onSubmit={add}
          />
        ) : null}
      </Dialog>
    </>
  )
}

function LinesSection({
  lines,
  onLines,
}: {
  readonly lines: readonly DraftLine[]
  readonly onLines: (update: (current: readonly DraftLine[]) => readonly DraftLine[]) => void
}) {
  function add(variant: AddableVariant, dropPriceCents: number) {
    onLines((current) =>
      current.some((line) => line.variant.variantId === variant.variantId)
        ? current.map((line) =>
            line.variant.variantId === variant.variantId
              ? { ...line, quantity: Math.min(line.quantity + 1, variant.stockQty) }
              : line,
          )
        : [...current, { variant, dropPriceCents, quantity: 1, agreedHryvnias: null }],
    )
  }

  function change(variantId: string, next: Partial<DraftLine>) {
    onLines((current) =>
      current
        .map((line) => (line.variant.variantId === variantId ? { ...line, ...next } : line))
        .filter((line) => line.quantity > 0),
    )
  }

  return (
    <section className="grid gap-3.5 rounded-card border border-subtle bg-surface p-5">
      <SectionTitle step="2" title="Товары" note="по цене дропшиппера из карточки" />
      {lines.length > 0 ? (
        <ul className="grid divide-y divide-subtle rounded-control border border-subtle">
          {lines.map((line) => (
            <LineRow key={line.variant.variantId} line={line} onChange={change} />
          ))}
        </ul>
      ) : null}
      <VariantSearch onAdd={add} />
    </section>
  )
}

function LineRow({
  line,
  onChange,
}: {
  readonly line: DraftLine
  readonly onChange: (variantId: string, next: Partial<DraftLine>) => void
}) {
  const { variant } = line
  const unitCents = unitPriceOf(line)
  const earnedCents = lineEarnings(line)
  const isBelowCost = earnsNothingOver(unitCents, variant.unitCostCents)
  const change = (next: Partial<DraftLine>) => onChange(variant.variantId, next)

  return (
    <li className="grid gap-2 p-3.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="min-w-0 flex-[1_1_240px]">
          <span className="block text-[13.5px] font-semibold text-ink">
            {variant.title} · {variant.variantLabel}
          </span>
          <span className="block text-[12px] text-faint">
            {variant.sku} · розница {money(variant.retailUnitPriceCents)} · цех{' '}
            {variant.unitCostCents === null ? 'не указан' : money(variant.unitCostCents)} · остаток{' '}
            {variant.stockQty}
          </span>
        </span>
        <QuantityStepper
          quantity={line.quantity}
          max={Math.min(variant.stockQty, ORDER_LINE_MAX_QUANTITY)}
          onQuantity={(quantity) => change({ quantity })}
        />
        <PriceField line={line} onAgreed={(agreedHryvnias) => change({ agreedHryvnias })} />
        <span
          className={cn(
            'w-24 text-right text-[14px] font-bold whitespace-nowrap',
            earnedCents === null || earnedCents >= 0 ? 'text-accent-hover' : 'text-alert',
          )}
        >
          {earnedCents === null ? '—' : signedMoney(earnedCents)}
        </span>
        <button
          type="button"
          onClick={() => change({ quantity: 0 })}
          className="text-[12.5px] font-semibold text-muted hover:text-ink"
        >
          Убрать
        </button>
      </div>
      {isBelowCost ? (
        <p className="rounded-control bg-alert-soft px-3 py-2 text-[12.5px] text-alert">
          Цена {money(unitCents)} не выше цены цеха — на этой строке заработка нет. Сохранить можно,
          если так договорились.
        </p>
      ) : null}
    </li>
  )
}

function QuantityStepper({
  quantity,
  max,
  onQuantity,
}: {
  readonly quantity: number
  readonly max: number
  readonly onQuantity: (quantity: number) => void
}) {
  const buttonClass =
    'grid h-10 w-9 place-items-center bg-hover text-[16px] font-semibold text-ink disabled:text-faint'

  return (
    <span className="flex h-10 overflow-hidden rounded-control border-[1.5px] border-strong">
      <button
        type="button"
        aria-label="Меньше"
        onClick={() => onQuantity(quantity - 1)}
        className={buttonClass}
      >
        −
      </button>
      <span className="grid w-10 place-items-center bg-raised text-[14px] font-semibold text-ink">
        {quantity}
      </span>
      <button
        type="button"
        aria-label="Больше"
        disabled={quantity >= max}
        onClick={() => onQuantity(quantity + 1)}
        className={buttonClass}
      >
        +
      </button>
    </span>
  )
}

// The card's drop price, or a price agreed for this deal: whole hryvnias,
// admin only — the one place a price comes from a form.
function PriceField({
  line,
  onAgreed,
}: {
  readonly line: DraftLine
  readonly onAgreed: (hryvnias: number | null) => void
}) {
  const isAgreed = line.agreedHryvnias !== null

  return (
    <span
      className={cn(
        'flex h-10 w-40 items-center gap-1 rounded-control border-[1.5px] pr-1 pl-3',
        isAgreed ? 'border-accent bg-raised' : 'border-strong bg-hover',
      )}
    >
      {isAgreed ? (
        <input
          value={line.agreedHryvnias ?? ''}
          onChange={(event) => onAgreed(wholeHryvnias(event.target.value))}
          inputMode="numeric"
          aria-label="Своя цена за штуку, грн"
          className="w-full min-w-0 bg-transparent text-[14px] font-semibold text-ink outline-none"
        />
      ) : (
        <span className="flex-1 text-[14px] font-semibold text-ink">
          {money(line.dropPriceCents)}
        </span>
      )}
      <button
        type="button"
        title={isAgreed ? 'Вернуть цену дропшиппера' : 'Своя цена'}
        aria-label={isAgreed ? 'Вернуть цену дропшиппера' : 'Своя цена'}
        onClick={() =>
          onAgreed(isAgreed ? null : Math.round(line.dropPriceCents / KOPIYKAS_PER_HRYVNIA))
        }
        className="grid size-8 place-items-center rounded-[6px] text-[15px] text-accent-hover hover:bg-hover"
      >
        {isAgreed ? '↺' : '✎'}
      </button>
    </span>
  )
}

function VariantSearch({
  onAdd,
}: {
  readonly onAdd: (variant: AddableVariant, dropPriceCents: number) => void
}) {
  const [search, setSearch] = useState('')
  const [found, setFound] = useState<readonly AddableVariant[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function find() {
    setError(null)
    startTransition(async () => {
      const result = await findOrderVariantsAction({ search, channel: SalesChannel.Dropship })
      if (!result.ok) {
        setError(errorText(result.error))
        return
      }
      setFound(result.data)
    })
  }

  return (
    <div className="grid gap-2">
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          find()
        }}
      >
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Добавить товар: название или артикул"
          aria-label="Поиск товара"
          className={cn(inputClassName, 'min-w-0 flex-1 basis-56')}
        />
        <Button
          type="submit"
          variant="secondary"
          disabled={isPending || search.trim().length < VARIANT_SEARCH_MIN_LENGTH}
        >
          {isPending ? 'Ищем…' : 'Найти'}
        </Button>
      </form>
      {error ? <p className="text-[13px] text-alert">{error}</p> : null}
      {found && found.length === 0 ? (
        <p className="text-[12.5px] text-muted">Ничего не нашлось.</p>
      ) : null}
      {found && found.length > 0 ? (
        <ul className="grid gap-1 rounded-control border border-subtle p-1.5">
          {found.map((variant) => (
            <FoundVariant key={variant.variantId} variant={variant} onAdd={onAdd} />
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function FoundVariant({
  variant,
  onAdd,
}: {
  readonly variant: AddableVariant
  readonly onAdd: (variant: AddableVariant, dropPriceCents: number) => void
}) {
  const dropPriceCents = variant.unitPriceCents

  return (
    <li className="flex flex-wrap items-center gap-2 rounded-[6px] px-2.5 py-2 text-[13px] hover:bg-hover">
      <span className="min-w-0 flex-1 basis-56">
        {variant.title} · {variant.variantLabel}
        {dropPriceCents === null ? (
          <span className="block text-[12px] text-alert">
            Нет цены дропшиппера — укажите её в карточке товара
          </span>
        ) : (
          <span className="block text-[12px] text-faint">
            {variant.sku} · дроп {money(dropPriceCents)} · розница{' '}
            {money(variant.retailUnitPriceCents)} · остаток {variant.stockQty}
          </span>
        )}
      </span>
      {dropPriceCents === null ? (
        <Link
          href={`/admin/catalog/${variant.productSlug}`}
          target="_blank"
          className="text-[12.5px] font-semibold text-accent-hover hover:underline"
        >
          Открыть карточку →
        </Link>
      ) : (
        <Button
          variant="quiet"
          size="sm"
          disabled={variant.stockQty < 1}
          onClick={() => onAdd(variant, dropPriceCents)}
        >
          {variant.stockQty < 1 ? 'Нет на складе' : 'Добавить'}
        </Button>
      )}
    </li>
  )
}

function DeliveryToggle({
  delivery,
  onDelivery,
}: {
  readonly delivery: Delivery
  readonly onDelivery: (delivery: Delivery) => void
}) {
  const options: readonly { value: Delivery; label: string }[] = [
    { value: 'point', label: 'Отделение или почтомат' },
    { value: 'courier', label: 'Курьер' },
  ]

  return (
    <div className="flex w-fit gap-1 rounded-[10px] bg-hover p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onDelivery(option.value)}
          className={cn(
            'min-h-9 rounded-[7px] px-3.5 text-[12.5px] font-semibold text-ink',
            delivery === option.value && 'bg-surface shadow-card',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function CourierFields({
  courier,
  onCourier,
}: {
  readonly courier: Courier
  readonly onCourier: (courier: Courier) => void
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)]">
      <Field label="Город">
        <input
          value={courier.city}
          onChange={(event) => onCourier({ ...courier, city: event.target.value })}
          maxLength={120}
          className={inputClassName}
        />
      </Field>
      <Field label="Улица, дом">
        <input
          value={courier.line1}
          onChange={(event) => onCourier({ ...courier, line1: event.target.value })}
          maxLength={120}
          className={inputClassName}
        />
      </Field>
      <Field label="Квартира">
        <input
          value={courier.line2}
          onChange={(event) => onCourier({ ...courier, line2: event.target.value })}
          maxLength={120}
          className={inputClassName}
        />
      </Field>
    </div>
  )
}

type Totals = {
  readonly units: number
  readonly totalCents: number
  readonly costCents: number
  readonly earningsCents: number
  readonly retailEarningsCents: number
  readonly hasUncosted: boolean
}

function SummaryCard({
  totals,
  error,
  isPending,
  isReady,
  onSubmit,
}: {
  readonly totals: Totals
  readonly error: string | null
  readonly isPending: boolean
  readonly isReady: boolean
  readonly onSubmit: () => void
}) {
  return (
    <aside className="grid min-w-[min(100%,300px)] flex-[1_1_320px] gap-3 lg:sticky lg:top-4">
      <section className="rounded-card border-[1.5px] border-ink bg-surface p-5">
        <p className="mb-3 text-[11.5px] font-semibold tracking-[0.05em] text-faint uppercase">
          Итог заказа
        </p>
        <dl className="grid gap-2 text-[13.5px]">
          <SummaryRow label="Позиций" value={`${totals.units} шт.`} />
          <SummaryRow label="К оплате партнёром" value={money(totals.totalCents)} isStrong />
          <SummaryRow label="Цена цеха" value={money(totals.costCents)} />
          <SummaryRow label="Заработок" value={signedMoney(totals.earningsCents)} isStrong />
          <SummaryRow label="С розницы было бы" value={money(totals.retailEarningsCents)} />
        </dl>
        {totals.hasUncosted ? (
          <p className="mt-2 text-[12px] text-alert">
            У части товаров нет цены цеха — заработок по ним не посчитан.
          </p>
        ) : null}
        <p className="mt-4 rounded-control bg-hover px-3.5 py-3 text-[12.5px] leading-relaxed text-muted">
          Оплата на счёт, предоплатой. Доставка по тарифам Новой Почты, платит получатель. Склад
          спишется сразу. Письма и SMS получателю не уходят.
        </p>
        {error ? <p className="mt-3 text-[13px] font-medium text-alert">{error}</p> : null}
        <Button className="mt-4 w-full" disabled={isPending || !isReady} onClick={onSubmit}>
          {isPending ? 'Создаём…' : `Создать заказ на ${money(totals.totalCents)}`}
        </Button>
        <p className="mt-2 text-center text-[12px] text-faint">
          Счёт выставляется на странице заказа
        </p>
      </section>
    </aside>
  )
}

function SummaryRow({
  label,
  value,
  isStrong = false,
}: {
  readonly label: string
  readonly value: string
  readonly isStrong?: boolean
}) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className={cn('text-ink', isStrong && 'font-bold')}>{value}</dd>
    </div>
  )
}

function unitPriceOf(line: DraftLine): number {
  return line.agreedHryvnias === null
    ? line.dropPriceCents
    : line.agreedHryvnias * KOPIYKAS_PER_HRYVNIA
}

// Null when the product has no workshop price: nothing to count it against.
function lineEarnings(line: DraftLine): number | null {
  const cost = line.variant.unitCostCents
  return cost === null ? null : (unitPriceOf(line) - cost) * line.quantity
}

function orderTotals(lines: readonly DraftLine[]): Totals {
  const costed = lines.filter((line) => line.variant.unitCostCents !== null)
  const sum = (pick: (line: DraftLine) => number, of = lines) =>
    of.reduce((total, line) => total + pick(line), 0)

  return {
    units: sum((line) => line.quantity),
    totalCents: sum((line) => unitPriceOf(line) * line.quantity),
    costCents: sum((line) => (line.variant.unitCostCents ?? 0) * line.quantity, costed),
    earningsCents: sum((line) => lineEarnings(line) ?? 0, costed),
    retailEarningsCents: sum(
      (line) =>
        (line.variant.retailUnitPriceCents - (line.variant.unitCostCents ?? 0)) * line.quantity,
      costed,
    ),
    hasUncosted: costed.length < lines.length,
  }
}

function pointInput(point: PointChoice | null) {
  if (!point) return null
  return {
    kind: point.kind,
    pointRef: point.pointRef,
    pointName: point.pointName,
    settlementName: point.settlementName,
  }
}

// A cleared field reads as 0, not as the card's price: the input stays open
// for the admin to type the new figure.
function wholeHryvnias(typed: string): number {
  const digits = typed.replace(/\D/g, '')
  return digits === '' ? 0 : Number.parseInt(digits, 10)
}

function money(cents: number): string {
  return formatWholeMoney(createMoney(cents, Currency.Uah))
}

function signedMoney(cents: number): string {
  return cents < 0 ? `−${money(-cents)}` : `+${money(cents)}`
}
