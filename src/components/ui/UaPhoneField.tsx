'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

// A complete Ukrainian mobile number: +380 and nine subscriber digits. The
// shop ships domestically, so the country is fixed rather than detected.
const UA_PHONE_DIGITS = 12
const UA_COUNTRY_CODE = '+380'

export function isUaPhoneComplete(value: string): boolean {
  return value.replace(/\D/g, '').length === UA_PHONE_DIGITS
}

// Grouped the way the design writes it: +380 XX XXX XX XX. The prefix is
// implied by the flag, so pasted 380/0 prefixes are folded away.
export function maskUaPhone(value: string): string {
  const digits = value
    .replace(/\D/g, '')
    .replace(/^380/, '')
    .replace(/^0/, '')
    .slice(0, 9)
  const parts = [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)]
  return digits ? `${UA_COUNTRY_CODE} ${parts.filter(Boolean).join(' ')}` : ''
}

// What the visitor actually types: the nine digits after +380, grouped
// XX XXX XX XX, or '' before the first digit.
export function uaLocalPart(value: string): string {
  const masked = maskUaPhone(value)
  const prefix = `${UA_COUNTRY_CODE} `
  return masked.startsWith(prefix) ? masked.slice(prefix.length) : ''
}

type UaPhoneInputProps = {
  readonly name: string
  // Controlled: the full masked number ("+380 63 …") or ''. Left out, the
  // input keeps its own value and submits it under `name` like a plain field.
  readonly value?: string
  readonly defaultValue?: string
  readonly onChange?: (value: string) => void
  readonly hasError?: boolean
  readonly isRequired?: boolean
  readonly size?: 'md' | 'lg'
  // The quick-order box is the phone and a button; its border carries the
  // accent so the one field reads as the thing to fill in.
  readonly isEmphasised?: boolean
}

export function UaPhoneInput({
  name,
  value,
  defaultValue = '',
  onChange,
  hasError = false,
  isRequired = false,
  size = 'md',
  isEmphasised = false,
}: UaPhoneInputProps) {
  const [ownValue, setOwnValue] = useState(() => maskUaPhone(defaultValue))
  const current = value ?? ownValue
  const isLarge = size === 'lg'

  function handleChange(typed: string) {
    const next = maskUaPhone(typed)
    if (value === undefined) setOwnValue(next)
    onChange?.(next)
  }

  return (
    <span
      className={cn(
        'flex items-center rounded-control border-[1.5px] bg-raised pl-3.5',
        isLarge ? 'min-h-13' : 'min-h-11.5',
        // The border lives on the wrapper because the flag and the country
        // code sit inside it, so focus is drawn here to match every other
        // field on the page.
        'focus-within:border-accent',
        borderToneOf(hasError, isEmphasised),
      )}
    >
      <span aria-hidden="true" className="w-6 shrink-0 text-center text-[16px] leading-none">
        🇺🇦
      </span>
      {/* Every number here starts the same way, so the country code is shown,
          not typed: the visitor begins with the operator code (63, 67, 50…). */}
      <span
        aria-hidden="true"
        className={cn(
          'ml-2 shrink-0 font-medium text-ink tabular-nums',
          isLarge ? 'text-[16px]' : 'text-[14.5px]',
        )}
      >
        {UA_COUNTRY_CODE}
      </span>

      <input
        type="tel"
        autoComplete="tel-national"
        inputMode="tel"
        placeholder="63 000 00 00"
        required={isRequired}
        value={uaLocalPart(current)}
        onChange={(event) => handleChange(event.target.value)}
        className={cn(
          'min-w-0 flex-1 border-0 bg-transparent pr-3.5 pl-1.5 font-medium text-ink tabular-nums outline-none placeholder:text-faint',
          isLarge ? 'h-12 text-[16px]' : 'h-11 text-[14.5px]',
        )}
      />
      {/* The form receives the whole number, country code included, exactly
          as it did when the visitor typed it themselves. */}
      <input type="hidden" name={name} value={current} />
    </span>
  )
}

function borderToneOf(hasError: boolean, isEmphasised: boolean): string {
  if (hasError) return 'border-alert'
  if (isEmphasised) return 'border-khaki'
  return 'border-strong'
}

type UaPhoneFieldProps = {
  readonly name: string
  readonly label: string
  readonly value: string
  readonly hasError?: boolean
  readonly onChange: (value: string) => void
}

export function UaPhoneField({ name, label, value, hasError = false, onChange }: UaPhoneFieldProps) {
  return (
    <label className="flex flex-col gap-1.5 text-[12.5px] font-semibold text-muted">
      {label}
      <UaPhoneInput name={name} value={value} hasError={hasError} onChange={onChange} />
    </label>
  )
}
