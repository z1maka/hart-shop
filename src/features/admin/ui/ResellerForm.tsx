'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { DialogClose } from '@/components/ui/Dialog'
import { inputClassName, invalidInputClassName, textareaClassName } from '@/components/ui/Field'
import { hasValidRnokppCheckDigit, isValidTaxId, taxIdKindOf, TaxIdKind } from '@/lib/tax-id'
import { cn } from '@/lib/utils'

// Every field as typed; the server trims and turns blanks into nothing.
export type ResellerFormDraft = {
  readonly name: string
  readonly taxId: string
  readonly contactName: string
  readonly phone: string
  readonly email: string
  readonly legalAddress: string
  readonly payoutIban: string
  readonly contractRef: string
  readonly note: string
}

export const EMPTY_RESELLER: ResellerFormDraft = {
  name: '',
  taxId: '',
  contactName: '',
  phone: '',
  email: '',
  legalAddress: '',
  payoutIban: '',
  contractRef: '',
  note: '',
}

type TextField = {
  readonly key: Exclude<keyof ResellerFormDraft, 'taxId' | 'note'>
  readonly label: string
  readonly placeholder: string
  readonly maxLength: number
}

const CONTACT_FIELDS: readonly TextField[] = [
  { key: 'contactName', label: 'Контактное лицо', placeholder: 'необязательно', maxLength: 120 },
  { key: 'phone', label: 'Телефон', placeholder: '+380', maxLength: 32 },
  { key: 'email', label: 'Email', placeholder: 'необязательно', maxLength: 200 },
]

const PAPER_FIELDS: readonly TextField[] = [
  {
    key: 'legalAddress',
    label: 'Юридический адрес — попадёт в счёт',
    placeholder: 'необязательно',
    maxLength: 300,
  },
  { key: 'contractRef', label: 'Договор', placeholder: '№ и дата, когда будет', maxLength: 120 },
]

type ResellerFormProps = {
  readonly initial: ResellerFormDraft
  readonly submitLabel: string
  readonly isPending: boolean
  readonly error: string | null
  readonly onSubmit: (draft: ResellerFormDraft) => void
}

// A partner who buys from the shop. The name and the code go on invoices as
// typed, in Ukrainian, though the panel itself speaks Russian.
export function ResellerForm({
  initial,
  submitLabel,
  isPending,
  error,
  onSubmit,
}: ResellerFormProps) {
  const [draft, setDraft] = useState<ResellerFormDraft>(initial)

  function change(key: keyof ResellerFormDraft, value: string) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(draft)
      }}
      className="grid gap-3.5"
    >
      {error ? (
        <p className="rounded-card border border-alert-edge bg-alert-soft px-4 py-3 text-[12.5px] font-medium text-alert">
          {error}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <label className="flex flex-col gap-1.5 text-[12.5px] font-semibold text-muted">
          Название — как в счёте
          <input
            value={draft.name}
            onChange={(event) => change('name', event.target.value)}
            placeholder="ФОП Прізвище Ім’я По батькові або ТОВ «…»"
            maxLength={200}
            required
            className={cn(inputClassName, 'w-full font-normal')}
          />
        </label>
        <TaxIdInput value={draft.taxId} onChange={(value) => change('taxId', value)} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {CONTACT_FIELDS.map((field) => (
          <FieldInput key={field.key} field={field} value={draft[field.key]} onChange={change} />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {PAPER_FIELDS.map((field) => (
          <FieldInput key={field.key} field={field} value={draft[field.key]} onChange={change} />
        ))}
      </div>
      <label className="flex flex-col gap-1.5 text-[12.5px] font-semibold text-muted">
        Заметка
        <textarea
          value={draft.note}
          onChange={(event) => change('note', event.target.value)}
          placeholder="для себя: условия, как связываемся"
          maxLength={1000}
          rows={2}
          className={cn(textareaClassName, 'w-full font-normal')}
        />
      </label>
      <p className="text-[12px] text-faint">
        IBAN для выплат понадобится во втором этапе — с наложенным платежом через нашу ТТН.
      </p>
      <div className="flex flex-wrap justify-end gap-2.5 border-t border-subtle pt-4">
        <DialogClose asChild>
          <Button type="button" variant="secondary" size="sm" disabled={isPending}>
            Отмена
          </Button>
        </DialogClose>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? 'Сохраняем…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  readonly field: TextField
  readonly value: string
  readonly onChange: (key: keyof ResellerFormDraft, value: string) => void
}) {
  return (
    <label className="flex flex-col gap-1.5 text-[12.5px] font-semibold text-muted">
      {field.label}
      <input
        value={value}
        onChange={(event) => onChange(field.key, event.target.value)}
        placeholder={field.placeholder}
        maxLength={field.maxLength}
        className={cn(inputClassName, 'w-full font-normal')}
      />
    </label>
  )
}

// Checked as it is typed: a ФОП's number carries a check digit, and a slipped
// digit on an invoice is a payment the bank may return.
function TaxIdInput({
  value,
  onChange,
}: {
  readonly value: string
  readonly onChange: (value: string) => void
}) {
  const code = value.trim()
  const isWrong = code.length >= 8 && !isValidTaxId(code)

  return (
    <label className="flex flex-col gap-1.5 text-[12.5px] font-semibold text-muted">
      ЄДРПОУ или РНОКПП
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="8 или 10 цифр"
        inputMode="numeric"
        maxLength={10}
        required
        className={cn(
          inputClassName,
          'w-full font-mono font-normal',
          isWrong && invalidInputClassName,
        )}
      />
      <TaxIdHint code={code} />
    </label>
  )
}

function TaxIdHint({ code }: { readonly code: string }) {
  const kind = taxIdKindOf(code)
  if (kind === TaxIdKind.Edrpou) return <span className="text-accent-hover">ЄДРПОУ компании</span>
  if (kind === TaxIdKind.Rnokpp) {
    return hasValidRnokppCheckDigit(code) ? (
      <span className="text-accent-hover">✓ РНОКПП, контрольная цифра сходится</span>
    ) : (
      <span className="text-alert">10 цифр — РНОКПП, но контрольная цифра не сходится</span>
    )
  }
  return <span className="font-normal text-faint">8 цифр — компания, 10 — ФОП</span>
}
