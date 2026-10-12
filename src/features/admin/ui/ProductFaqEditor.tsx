'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { inputClassName, textareaClassName } from '@/components/ui/Field'
import {
  FAQ_ANSWER_MAX_LENGTH,
  FAQ_MAX_ENTRIES,
  FAQ_QUESTION_MAX_LENGTH,
} from '@/features/catalog/model/category-content'
import { cn } from '@/lib/utils'

type FaqRow = {
  // Stable across removals, so React keeps each row's inputs with it.
  readonly key: number
  readonly question: string
  readonly answer: string
}

type ProductFaqEditorProps = {
  readonly entries: readonly { readonly question: string; readonly answer: string }[]
  // What the last save objected to, if anything.
  readonly error?: string
  // Adding and removing rows change the form without an input event.
  readonly onChange: () => void
}

const removeButtonClass =
  'inline-flex size-10 shrink-0 items-center justify-center rounded-control border border-subtle bg-surface text-[15px] text-muted hover:border-faint hover:text-alert'

// The questions under the product's description, in this order. A pair left
// fully blank is not saved; a question without an answer stops the save.
export function ProductFaqEditor({ entries, error, onChange }: ProductFaqEditorProps) {
  const nextKey = useRef(entries.length)
  const [rows, setRows] = useState<readonly FaqRow[]>(() =>
    entries.map((entry, index) => ({ key: index, ...entry })),
  )

  function update(next: readonly FaqRow[]) {
    setRows(next)
    onChange()
  }

  function add() {
    const key = nextKey.current
    nextKey.current += 1
    update([...rows, { key, question: '', answer: '' }])
  }

  function edit(key: number, field: 'question' | 'answer', text: string) {
    setRows(rows.map((row) => (row.key === key ? { ...row, [field]: text } : row)))
  }

  return (
    <div className="grid gap-3" data-invalid={error ? 'true' : undefined}>
      {/* Tells the save that this form has the editor, even with no rows. */}
      <input type="hidden" name="faqEditor" value="1" />

      {rows.map((row) => (
        <div key={row.key} className="grid gap-2 rounded-control border border-subtle p-3">
          <div className="flex gap-2">
            <input
              name="faqQuestion"
              value={row.question}
              onChange={(event) => edit(row.key, 'question', event.target.value)}
              maxLength={FAQ_QUESTION_MAX_LENGTH}
              placeholder="Вопрос, как его задаёт покупатель"
              aria-label="Вопрос"
              className={cn(inputClassName, 'min-w-0 flex-1')}
            />
            <button
              type="button"
              onClick={() => update(rows.filter((entry) => entry.key !== row.key))}
              aria-label={`Удалить вопрос «${row.question || 'пустой'}»`}
              className={removeButtonClass}
            >
              ✕
            </button>
          </div>
          <textarea
            name="faqAnswer"
            value={row.answer}
            onChange={(event) => edit(row.key, 'answer', event.target.value)}
            maxLength={FAQ_ANSWER_MAX_LENGTH}
            rows={3}
            placeholder="Ответ"
            aria-label="Ответ"
            className={textareaClassName}
          />
        </div>
      ))}

      {error ? <span className="text-[12px] font-medium text-alert">{error}</span> : null}

      {rows.length < FAQ_MAX_ENTRIES ? (
        <div>
          <Button type="button" variant="secondary" onClick={add}>
            + Добавить вопрос
          </Button>
        </div>
      ) : null}
    </div>
  )
}
