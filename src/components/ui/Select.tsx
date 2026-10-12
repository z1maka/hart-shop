'use client'

import * as SelectPrimitive from '@radix-ui/react-select'
import { cn } from '@/lib/utils'

export type SelectOption = {
  readonly value: string
  readonly label: string
}

type SelectSize = 'sm' | 'md'

type SelectProps = {
  readonly value: string
  readonly onValueChange: (value: string) => void
  readonly options: readonly SelectOption[]
  readonly label: string
  // Shown before the value inside the trigger («Сортування: Рекомендовані»).
  readonly prefix?: string
  readonly size?: SelectSize
  readonly className?: string
  readonly isDisabled?: boolean
}

const TRIGGER_SIZE_CLASSES: Record<SelectSize, string> = {
  sm: 'min-h-10 px-3 text-[12.5px]',
  md: 'min-h-11 px-3.5 text-[13.5px]',
}

export function Select({
  value,
  onValueChange,
  options,
  label,
  prefix,
  size = 'md',
  className,
  isDisabled = false,
}: SelectProps) {
  const selected = options.find((option) => option.value === value)

  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={isDisabled}>
      <SelectPrimitive.Trigger
        aria-label={label}
        className={cn(
          'inline-flex items-center justify-between gap-3 rounded-control border border-strong bg-raised font-semibold text-ink transition-colors',
          'hover:border-ink focus-visible:border-accent data-[state=open]:border-accent',
          TRIGGER_SIZE_CLASSES[size],
          isDisabled && 'cursor-not-allowed opacity-60',
          className,
        )}
      >
        <span>
          {prefix ? <span className="mr-1.5 font-medium text-faint">{prefix}:</span> : null}
          <SelectPrimitive.Value>{selected?.label ?? ''}</SelectPrimitive.Value>
        </span>
        <SelectPrimitive.Icon className="text-faint">
          <ChevronDown />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className={cn(
            'z-50 max-h-[min(22rem,var(--radix-select-content-available-height))] w-[max(var(--radix-select-trigger-width),12rem)]',
            'overflow-hidden rounded-card border border-subtle bg-raised shadow-card',
          )}
        >
          <SelectPrimitive.ScrollUpButton className="flex h-6 items-center justify-center text-faint">
            ▴
          </SelectPrimitive.ScrollUpButton>

          <SelectPrimitive.Viewport className="p-1.5">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className={cn(
                  'flex cursor-pointer items-center justify-between gap-3 rounded-chip px-3 py-2.5 text-[13.5px] text-ink outline-none select-none',
                  'data-[highlighted]:bg-hover data-[state=checked]:font-semibold',
                )}
              >
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="text-accent">
                  <Check />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>

          <SelectPrimitive.ScrollDownButton className="flex h-6 items-center justify-center text-faint">
            ▾
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}

function ChevronDown() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d="M2.5 4.5 6 8l3.5-3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Check() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d="m2.5 6.2 2.3 2.3L9.5 3.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
