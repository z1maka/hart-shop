'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  createCategoryAction,
  type NewCategoryResult,
} from '@/features/admin/actions/category-actions'
import { errorText } from '@/features/admin/ui/messages'
import { Button } from '@/components/ui/Button'
import { Field, inputClassName, textareaClassName } from '@/components/ui/Field'

type NewCategoryPanelProps = {
  readonly nextPosition: number
}

export function NewCategoryPanel({ nextPosition }: NewCategoryPanelProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [result, submit, isPending] = useActionState<NewCategoryResult | null, FormData>(
    async (previous, formData) => {
      const next = await createCategoryAction(previous, formData)

      if (next.ok) {
        setIsOpen(false)
        router.refresh()
      }

      return next
    },
    null,
  )

  const typed = result && !result.ok ? (result.values ?? {}) : {}

  if (!isOpen) {
    return (
      <Button type="button" variant="secondary" size="sm" onClick={() => setIsOpen(true)}>
        + Новая категория
      </Button>
    )
  }

  return (
    <form
      action={submit}
      className="order-last w-full rounded-card border-[1.5px] border-accent bg-surface p-5"
    >
      <h3 className="mb-3.5 font-display text-[15px] font-bold text-ink">Новая категория</h3>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(190px,100%),1fr))] gap-3.5">
        <Field label="Название">
          <input
            name="name"
            defaultValue={typed.name ?? ''}
            required
            placeholder="Рукавиці"
            className={inputClassName}
          />
        </Field>
        <Field label="Адрес">
          <input
            name="slug"
            defaultValue={typed.slug ?? ''}
            placeholder="gloves"
            className={inputClassName}
          />
        </Field>
        <Field label="Позиция в хедере">
          <input
            name="position"
            type="number"
            min={0}
            defaultValue={typed.position ?? nextPosition}
            className={inputClassName}
          />
        </Field>
        <Field label="Описание над сеткой товаров" className="col-span-full">
          <textarea
            name="description"
            rows={2}
            defaultValue={typed.description ?? ''}
            placeholder="Одно-два предложения над сеткой товаров."
            className={textareaClassName}
          />
        </Field>
      </div>

      {result && !result.ok ? (
        <p className="mt-3.5 text-[12.5px] text-alert">{errorText(result.error)}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2.5">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Создаём…' : 'Создать скрытой'}
        </Button>
        <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>
          Отменить
        </Button>
      </div>

      <p className="mt-3.5 max-w-[74ch] text-[12px] leading-relaxed text-muted">
        Новая категория создаётся скрытой: наполните её товарами и опубликуйте, когда будет что
        показать. Пустая категория в хедере — худшее, что может увидеть покупатель.
      </p>
    </form>
  )
}
