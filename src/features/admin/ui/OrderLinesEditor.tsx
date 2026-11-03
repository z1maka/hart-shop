'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import {
  editOrderLinesAction,
  findOrderVariantsAction,
  type OrderLinesEditOutcome,
} from '@/features/admin/actions/order-actions'
import { errorText } from '@/features/admin/ui/messages'
import type { AddableVariant, AdminOrderLine } from '@/features/orders'
import {
  ORDER_LINE_MAX_QUANTITY,
  OrderEditBlock,
  VARIANT_SEARCH_MIN_LENGTH,
} from '@/features/orders/model/order-edit'
import { Button } from '@/components/ui/Button'
import { inputClassName } from '@/components/ui/Field'
import { createMoney, Currency, formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'

type OrderLinesEditorProps = {
  readonly orderId: string
  readonly lines: readonly AdminOrderLine[]
  readonly editBlock: OrderEditBlock | null
}

type DraftLine = {
  readonly variantId: string
  readonly title: string
  readonly variantLabel: string
  readonly sku: string
  readonly quantity: number
  readonly priceLabel: string
  readonly isNew: boolean
}

const EDIT_BLOCK_HINTS: Record<OrderEditBlock, string> = {
  [OrderEditBlock.Closed]: 'Заказ закрыт — состав больше не меняется.',
  [OrderEditBlock.Waybill]:
    'Чтобы поменять состав, сначала удалите накладную или сотрите трек-номер, введённый вручную.',
  [OrderEditBlock.Card]: 'Заказ с оплатой картой не меняется: добавку оформите отдельным заказом.',
  [OrderEditBlock.Paid]: 'Перевод уже получен — добавку оформите отдельным заказом.',
}

export function OrderLinesEditor({ orderId, lines, editBlock }: OrderLinesEditorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  if (editBlock) {
    return <p className="mt-3 text-[12.5px] text-muted">{EDIT_BLOCK_HINTS[editBlock]}</p>
  }

  function saved(outcome: OrderLinesEditOutcome) {
    setIsOpen(false)
    setNotice(
      `Состав сохранён. Итого: ${moneyLabel(outcome.previousTotalCents)} → ${moneyLabel(outcome.totalCents)}.`,
    )
  }

  return (
    <div className="mt-4 border-t border-subtle pt-3.5">
      {notice ? <p className="mb-3 text-[13px] text-ink">{notice}</p> : null}
      {isOpen ? (
        <LinesForm
          orderId={orderId}
          lines={lines}
          onSaved={saved}
          onCancel={() => setIsOpen(false)}
        />
      ) : (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setNotice(null)
            setIsOpen(true)
          }}
        >
          Изменить состав
        </Button>
      )}
    </div>
  )
}

type LinesFormProps = {
  readonly orderId: string
  readonly lines: readonly AdminOrderLine[]
  readonly onSaved: (outcome: OrderLinesEditOutcome) => void
  readonly onCancel: () => void
}

function LinesForm({ orderId, lines, onSaved, onCancel }: LinesFormProps) {
  const router = useRouter()
  const [draft, setDraft] = useState<readonly DraftLine[]>(() => lines.flatMap(draftLineOf))
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const frozen = lines.filter((line) => line.variantId === null)

  // A line at zero stays in the list while the admin retypes its quantity;
  // the server drops it on save.
  function setQuantity(variantId: string, quantity: number) {
    setDraft((current) =>
      current.map((line) => (line.variantId === variantId ? { ...line, quantity } : line)),
    )
  }

  function add(variant: AddableVariant) {
    setDraft((current) =>
      current.some((line) => line.variantId === variant.variantId)
        ? current.map((line) =>
            line.variantId === variant.variantId ? { ...line, quantity: line.quantity + 1 } : line,
          )
        : [...current, addedLineOf(variant)],
    )
  }

  function save() {
    setError(null)
    startTransition(async () => {
      const result = await editOrderLinesAction({
        orderId,
        lines: draft.map((line) => ({ variantId: line.variantId, quantity: line.quantity })),
      })
      if (!result.ok) {
        setError(errorText(result.error))
        return
      }

      onSaved(result.data)
      router.refresh()
    })
  }

  return (
    <div className="grid gap-3">
      <ul className="grid gap-2">
        {draft.map((line) => (
          <DraftRow key={line.variantId} line={line} onQuantity={setQuantity} />
        ))}
        {frozen.map((line) => (
          <li key={line.id} className="text-[12.5px] text-muted">
            {line.title} × {line.quantity} — вариант удалён из каталога, строка не меняется.
          </li>
        ))}
      </ul>
      <VariantPicker onPick={add} />
      <p className="text-[12px] leading-relaxed text-muted">
        У товаров, чьё количество меняется, цена пересчитается по каталогу — с оптом, как в корзине.
        Остаток на складе обновится. Покупателю ничего не отправляется.
      </p>
      {error ? <p className="text-[13px] text-alert">{error}</p> : null}
      <div className="flex flex-wrap gap-2.5">
        <Button disabled={isPending || draft.length === 0} onClick={save}>
          {isPending ? 'Сохраняем…' : 'Сохранить состав'}
        </Button>
        <Button variant="quiet" disabled={isPending} onClick={onCancel}>
          Отмена
        </Button>
      </div>
    </div>
  )
}

type DraftRowProps = {
  readonly line: DraftLine
  readonly onQuantity: (variantId: string, quantity: number) => void
}

function DraftRow({ line, onQuantity }: DraftRowProps) {
  const isRemoved = line.quantity === 0

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13.5px]">
      <span className={cn('min-w-0 flex-1 basis-56', isRemoved && 'text-faint line-through')}>
        {line.title}
        <span className="block text-[12px] text-faint">
          {[line.variantLabel, line.sku, line.priceLabel].filter(Boolean).join(' · ')}
          {line.isNew ? ' · новая позиция' : ''}
        </span>
      </span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={ORDER_LINE_MAX_QUANTITY}
        value={line.quantity}
        aria-label={`Количество: ${line.title}`}
        onChange={(event) => onQuantity(line.variantId, clampQuantity(event.target.value))}
        className={cn(inputClassName, 'w-24')}
      />
      <Button variant="quiet" size="sm" onClick={() => onQuantity(line.variantId, 0)}>
        Убрать
      </Button>
    </li>
  )
}

function VariantPicker({ onPick }: { readonly onPick: (variant: AddableVariant) => void }) {
  const [search, setSearch] = useState('')
  const [found, setFound] = useState<readonly AddableVariant[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function find() {
    setError(null)
    startTransition(async () => {
      const result = await findOrderVariantsAction({ search })
      if (!result.ok) {
        setError(errorText(result.error))
        return
      }
      setFound(result.data)
    })
  }

  return (
    <div className="grid gap-2 rounded-control border border-subtle p-3">
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
        <ul className="grid gap-1.5">
          {found.map((variant) => (
            <li key={variant.variantId} className="flex flex-wrap items-center gap-2 text-[13px]">
              <span className="min-w-0 flex-1 basis-56">
                {variant.title}
                <span className="block text-[12px] text-faint">
                  {[
                    variant.variantLabel,
                    variant.sku,
                    moneyLabel(variant.unitPriceCents),
                    `остаток ${variant.stockQty}`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
              <Button variant="quiet" size="sm" onClick={() => onPick(variant)}>
                Добавить
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function draftLineOf(line: AdminOrderLine): DraftLine[] {
  if (!line.variantId) return []

  return [
    {
      variantId: line.variantId,
      title: line.title,
      variantLabel: line.variantLabel,
      sku: line.sku,
      quantity: line.quantity,
      priceLabel: line.unitPriceLabel,
      isNew: false,
    },
  ]
}

function addedLineOf(variant: AddableVariant): DraftLine {
  return {
    variantId: variant.variantId,
    title: variant.title,
    variantLabel: variant.variantLabel,
    sku: variant.sku,
    quantity: 1,
    priceLabel: moneyLabel(variant.unitPriceCents),
    isNew: true,
  }
}

function clampQuantity(typed: string): number {
  const quantity = Number.parseInt(typed, 10)
  if (Number.isNaN(quantity)) return 0
  return Math.min(ORDER_LINE_MAX_QUANTITY, Math.max(0, quantity))
}

function moneyLabel(cents: number): string {
  return formatMoney(createMoney(cents, Currency.Uah))
}
