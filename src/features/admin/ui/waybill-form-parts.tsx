'use client'

import { WAYBILL_DESCRIPTION_MAX_LENGTH } from '@/config/delivery'
import type { AdminWaybillView, IssuedWaybill } from '@/features/orders'
import { inputClassName } from '@/components/ui/Field'
import { cn } from '@/lib/utils'

const GRAMS_PER_KILO = 1000

// The waybill actions are not idempotent: after a lost answer the admin must
// look before clicking again.
export const NO_ANSWER_TEXT =
  'Нет ответа от сервера. Обновите страницу и проверьте, не создалась ли накладная.'

export type Notice = { readonly text: string; readonly isError: boolean }

export function initialWeightKg(weightGrams: number): string {
  return weightGrams > 0 ? String(weightGrams / GRAMS_PER_KILO) : ''
}

export function weightKgToGrams(weightKg: string): number {
  return Math.round(Number(weightKg.replace(',', '.')) * GRAMS_PER_KILO)
}

export function issuedNotice(issued: IssuedWaybill): Notice {
  const suffix = issued.packed ? ' Заказ переведён в «Упакован».' : ''
  return { text: `ТТН ${issued.number} создана.${suffix}`, isError: false }
}

type ParcelFieldsProps = {
  readonly weightKg: string
  readonly description: string
  readonly hasProductWeight: boolean
  readonly onWeightKg: (value: string) => void
  readonly onDescription: (value: string) => void
}

export function ParcelFields(props: ParcelFieldsProps) {
  return (
    <>
      <label className="flex flex-col gap-1.5 text-[12.5px] font-semibold text-muted">
        Вес посылки, кг
        <input
          inputMode="decimal"
          value={props.weightKg}
          onChange={(event) => props.onWeightKg(event.target.value)}
          placeholder="4.5"
          className={cn(inputClassName, 'font-normal')}
        />
      </label>
      {props.hasProductWeight ? null : (
        <p className="text-[12px] leading-relaxed text-faint">
          У товаров не указан вес — введите его вручную.
        </p>
      )}
      <label className="flex flex-col gap-1.5 text-[12.5px] font-semibold text-muted">
        Описание груза
        <input
          value={props.description}
          onChange={(event) => props.onDescription(event.target.value)}
          maxLength={WAYBILL_DESCRIPTION_MAX_LENGTH}
          className={cn(inputClassName, 'font-normal')}
        />
      </label>
    </>
  )
}

export function MoneyRows({ waybill }: { readonly waybill: AdminWaybillView }) {
  return (
    <>
      <Row label="Объявленная стоимость" value={waybill.declaredValueLabel} />
      <Row label="Контроль оплаты" value={waybill.codLabel ?? 'нет — заказ оплачен'} />
      <Row label="Доставку оплачивает" value="получатель" />
    </>
  )
}

export function Row({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right text-ink">{value}</dd>
    </div>
  )
}

export function NoticeLine({ notice }: { readonly notice: Notice | null }) {
  if (!notice) return null

  return (
    <p
      className={cn('text-[13px] font-medium', notice.isError ? 'text-alert' : 'text-accent-hover')}
    >
      {notice.text}
    </p>
  )
}
