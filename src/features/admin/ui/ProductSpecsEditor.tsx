'use client'

import { useRef, useState } from 'react'
import { FABRIC_LAYERS } from '@/config/fabric-layers'
import { Button } from '@/components/ui/Button'
import { inputClassName, invalidInputClassName } from '@/components/ui/Field'
import { cn } from '@/lib/utils'

type SpecRow = {
  // Stable across reorders, so React keeps each row's inputs with it.
  readonly key: number
  readonly label: string
  readonly value: string
}

type ProductSpecsEditorProps = {
  readonly specs: readonly { readonly label: string; readonly value: string }[]
  // Fabric layers drive their own block on the product page, so they are a
  // fixed first row with a choice rather than free text.
  readonly layers: number
  // What the last save objected to in the layers choice, if anything.
  readonly layersError?: string
  // Adding, removing and moving rows change the form without an input event.
  readonly onChange: () => void
}

const NOT_FABRIC = 1
const LAYER_CHOICES = Array.from({ length: FABRIC_LAYERS.length }, (_, index) => index + 1)

const rowClass =
  'grid grid-cols-[minmax(0,1fr)_auto] gap-2.5 rounded-control border border-subtle p-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_132px] sm:border-0 sm:p-0'

const iconButtonClass =
  'inline-flex size-10 shrink-0 items-center justify-center rounded-control border border-subtle bg-surface text-[15px] text-muted hover:border-faint hover:text-ink disabled:pointer-events-none disabled:opacity-35'

// The product page lists these rows in this order. Each row is a name and a
// value; a row left with either half empty is not saved.
export function ProductSpecsEditor({
  specs,
  layers,
  onChange,
  layersError,
}: ProductSpecsEditorProps) {
  const nextKey = useRef(specs.length)
  const [rows, setRows] = useState<readonly SpecRow[]>(() =>
    specs.map((spec, index) => ({ key: index, label: spec.label, value: spec.value })),
  )
  const [focusKey, setFocusKey] = useState<number | null>(null)

  function update(next: readonly SpecRow[]) {
    setRows(next)
    onChange()
  }

  function add() {
    const key = nextKey.current
    nextKey.current += 1
    setFocusKey(key)
    update([...rows, { key, label: '', value: '' }])
  }

  function edit(key: number, field: 'label' | 'value', text: string) {
    setRows(rows.map((row) => (row.key === key ? { ...row, [field]: text } : row)))
  }

  function move(index: number, offset: -1 | 1) {
    const target = index + offset
    const moved = rows[index]
    const other = rows[target]
    if (!moved || !other) return
    const next = [...rows]
    next[index] = other
    next[target] = moved
    update(next)
  }

  return (
    <div className="grid gap-2.5">
      <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_132px] gap-2.5 text-[12px] font-semibold text-muted sm:grid">
        <span>Название</span>
        <span>Значение</span>
      </div>

      <div className={rowClass} data-invalid={layersError ? 'true' : undefined}>
        <span className="col-span-2 flex min-h-11.5 items-center rounded-control border-[1.5px] border-transparent bg-sunken px-3.5 text-[14px] text-muted sm:col-span-1">
          Слои ткани
        </span>
        {/* Keyed by the count it should show: a select takes its
            defaultValue only on mount (see ProductEditor). */}
        <select
          key={layers}
          name="layers"
          defaultValue={layers}
          onChange={onChange}
          aria-label="Слои ткани"
          className={cn(inputClassName, 'col-span-2 sm:col-span-1', layersError && invalidInputClassName)}
        >
          {LAYER_CHOICES.map((count) => (
            <option key={count} value={count}>
              {count === NOT_FABRIC ? 'Нет — изделие не из ткани' : `${count}`}
            </option>
          ))}
        </select>
        {layersError ? (
          <span className="col-span-2 text-[12px] font-medium text-alert">{layersError}</span>
        ) : null}
      </div>

      {rows.map((row, index) => (
        <div key={row.key} className={rowClass}>
          <input
            name="specLabel"
            value={row.label}
            onChange={(event) => edit(row.key, 'label', event.target.value)}
            placeholder="Напр. Розмір"
            aria-label="Название характеристики"
            autoFocus={row.key === focusKey}
            className={cn(inputClassName, 'col-span-2 sm:col-span-1')}
          />
          <input
            name="specValue"
            value={row.value}
            onChange={(event) => edit(row.key, 'value', event.target.value)}
            placeholder="Напр. 150 × 280 см"
            aria-label="Значение характеристики"
            className={inputClassName}
          />
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => move(index, -1)}
              disabled={index === 0}
              aria-label="Поднять выше"
              className={iconButtonClass}
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => move(index, 1)}
              disabled={index === rows.length - 1}
              aria-label="Опустить ниже"
              className={iconButtonClass}
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => update(rows.filter((entry) => entry.key !== row.key))}
              aria-label={`Удалить «${row.label || 'пустую строку'}»`}
              className={cn(iconButtonClass, 'hover:text-alert')}
            >
              ✕
            </button>
          </div>
        </div>
      ))}

      <div>
        <Button type="button" variant="secondary" onClick={add}>
          + Добавить характеристику
        </Button>
      </div>
    </div>
  )
}
