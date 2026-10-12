'use client'

import { useState } from 'react'
import type { BankAccountDraft } from '@/config/requisites'
import { Button } from '@/components/ui/Button'
import { DialogClose } from '@/components/ui/Dialog'
import { inputClassName, invalidInputClassName } from '@/components/ui/Field'
import { isValidUaIban, mfoOfUaIban, normalizeIban, UA_IBAN_LENGTH } from '@/lib/iban'
import { cn } from '@/lib/utils'

type TextField = {
  readonly key: Exclude<keyof BankAccountDraft, 'iban'>
  readonly label: string
  readonly placeholder: string
  readonly maxLength: number
  readonly isNumeric?: boolean
}

export const EMPTY_BANK_ACCOUNT: BankAccountDraft = {
  name: '',
  recipient: '',
  iban: '',
  taxId: '',
  bankName: '',
  bankEdrpou: '',
}

// The values land in a Ukrainian payment order as typed, so the placeholders
// show them in Ukrainian even though the panel itself speaks Russian. The
// name is the admin's own and never reaches a buyer.
const NAME_FIELD: TextField = {
  key: 'name',
  label: 'Название (видно только в админке)',
  placeholder: 'Например «Универсал — основной»',
  maxLength: 60,
}

const RECIPIENT_FIELDS: readonly TextField[] = [
  {
    key: 'recipient',
    label: 'Получатель',
    placeholder: 'ФОП Прізвище Ім’я По батькові',
    maxLength: 160,
  },
  {
    key: 'taxId',
    label: 'ИНН / ЕДРПОУ получателя',
    placeholder: '10 или 8 цифр',
    maxLength: 10,
    isNumeric: true,
  },
]

const BANK_FIELDS: readonly TextField[] = [
  { key: 'bankName', label: 'Банк', placeholder: 'АТ «УНІВЕРСАЛ БАНК»', maxLength: 160 },
  {
    key: 'bankEdrpou',
    label: 'ЕДРПОУ банка',
    placeholder: '8 цифр',
    maxLength: 8,
    isNumeric: true,
  },
]

type BankAccountFormProps = {
  readonly initial: BankAccountDraft
  readonly submitLabel: string
  readonly isPending: boolean
  readonly error: string | null
  readonly onSubmit: (draft: BankAccountDraft) => void
}

export function BankAccountForm({
  initial,
  submitLabel,
  isPending,
  error,
  onSubmit,
}: BankAccountFormProps) {
  const [draft, setDraft] = useState<BankAccountDraft>(initial)

  function change(key: keyof BankAccountDraft, value: string) {
    setDraft({ ...draft, [key]: value })
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

      <FieldInput field={NAME_FIELD} value={draft.name} onChange={change} />
      <div className="grid gap-3 sm:grid-cols-2">
        {RECIPIENT_FIELDS.map((field) => (
          <FieldInput key={field.key} field={field} value={draft[field.key]} onChange={change} />
        ))}
      </div>
      <IbanInput value={draft.iban} onChange={(value) => change('iban', value)} />
      <div className="grid gap-3 sm:grid-cols-2">
        {BANK_FIELDS.map((field) => (
          <FieldInput key={field.key} field={field} value={draft[field.key]} onChange={change} />
        ))}
      </div>

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
  readonly onChange: (key: keyof BankAccountDraft, value: string) => void
}) {
  return (
    <label className="flex flex-col gap-1.5 text-[12.5px] font-semibold text-muted">
      {field.label}
      <input
        value={value}
        onChange={(event) => onChange(field.key, event.target.value)}
        placeholder={field.placeholder}
        maxLength={field.maxLength}
        inputMode={field.isNumeric ? 'numeric' : undefined}
        required
        className={cn(inputClassName, 'w-full font-normal')}
      />
    </label>
  )
}

// Checked as it is typed: a slipped digit in an IBAN still looks like an
// IBAN, and the owner should see that before a buyer's money goes astray.
function IbanInput({
  value,
  onChange,
}: {
  readonly value: string
  readonly onChange: (value: string) => void
}) {
  const iban = normalizeIban(value)
  const isComplete = iban.length >= UA_IBAN_LENGTH
  const isValid = isValidUaIban(iban)

  return (
    <label className="flex flex-col gap-1.5 text-[12.5px] font-semibold text-muted">
      IBAN
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="UA00 0000 0000 0000 0000 0000 0000 0"
        maxLength={40}
        autoComplete="off"
        spellCheck={false}
        required
        className={cn(
          inputClassName,
          'w-full font-mono font-normal tracking-[0.02em]',
          isComplete && !isValid && invalidInputClassName,
        )}
      />
      <IbanHint iban={iban} isComplete={isComplete} isValid={isValid} />
    </label>
  )
}

function IbanHint({
  iban,
  isComplete,
  isValid,
}: {
  readonly iban: string
  readonly isComplete: boolean
  readonly isValid: boolean
}) {
  if (iban.length === 0) {
    return (
      <span className="font-normal text-faint">
        МФО банка входит в IBAN — отдельно вводить не нужно.
      </span>
    )
  }
  if (isValid) {
    return (
      <span className="text-accent-hover">
        ✓ Контрольная сумма сходится · МФО {mfoOfUaIban(iban)}
      </span>
    )
  }
  if (!isComplete) {
    return (
      <span className="font-normal text-faint">Ещё символов: {UA_IBAN_LENGTH - iban.length}</span>
    )
  }
  return <span className="text-alert">Контрольная сумма не сходится — проверьте цифры</span>
}
