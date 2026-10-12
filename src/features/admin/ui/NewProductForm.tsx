'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import {
  createProductAction,
  type SaveProductResult,
} from '@/features/admin/actions/product-actions'
import type { ProductEditorCategory } from '@/features/admin/queries/get-product-draft'
import { errorText } from '@/features/admin/ui/messages'
import { Button } from '@/components/ui/Button'
import { Field, inputClassName, textareaClassName } from '@/components/ui/Field'

type NewProductFormProps = {
  readonly categories: readonly ProductEditorCategory[]
}

export function NewProductForm({ categories }: NewProductFormProps) {
  const [result, submit, isPending] = useActionState<SaveProductResult | null, FormData>(
    (previous, formData) => createProductAction(previous, formData),
    null,
  )
  const typed = result && !result.ok ? (result.values ?? {}) : {}

  return (
    <form action={submit} className="max-w-[720px]">
      <Link
        href="/admin/catalog"
        className="mb-2 inline-block text-[12.5px] font-semibold text-accent-hover hover:underline"
      >
        ← К каталогу
      </Link>
      <h1 className="mb-1.5 font-display text-h2 font-bold text-ink">Новый товар</h1>
      <p className="mb-5.5 max-w-[74ch] text-[12.5px] text-muted">
        Создаётся черновик с одним цветом. Фотографии, характеристики и остальные цвета добавляются
        в редакторе, который откроется следом.
      </p>

      <div className="rounded-card border border-subtle bg-surface p-5.5">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-4">
          <Field label="Артикул">
            <input
              name="sku"
              defaultValue={typed.sku ?? ''}
              required
              placeholder="FOX-FX3"
              className={inputClassName}
            />
          </Field>
          <Field label="Категория">
            <select name="categoryId" className={inputClassName} required>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.isVisible ? category.name : `${category.name} (скрыта)`}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Название на витрине" className="col-span-full">
            <input
              name="title"
              defaultValue={typed.title ?? ''}
              required
              placeholder="Анти-тепловізійне пончо FX-3"
              className={inputClassName}
            />
          </Field>
          <Field label="Описание на витрине" className="col-span-full">
            <textarea
              name="description"
              rows={4}
              defaultValue={typed.description ?? ''}
              required
              placeholder="Два-три предложения: что это, для чего и чем не является."
              className={textareaClassName}
            />
          </Field>
          <Field label="Цена на витрине, грн">
            <input
              name="price"
              defaultValue={typed.price ?? ''}
              required
              inputMode="decimal"
              placeholder="1980"
              className={inputClassName}
            />
          </Field>
          <Field label="Вес, кг">
            <input
              name="weight"
              defaultValue={typed.weight ?? ''}
              required
              inputMode="decimal"
              placeholder="1.4"
              className={inputClassName}
            />
          </Field>
          <Field label="Первый цвет">
            <input
              name="variantColor"
              defaultValue={typed.variantColor ?? ''}
              required
              placeholder="Мультикам"
              className={inputClassName}
            />
          </Field>
        </div>

        {result && !result.ok ? (
          <p className="mt-4 text-[12.5px] text-alert">{errorText(result.error)}</p>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2.5">
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Создаём…' : 'Создать черновик'}
          </Button>
          <Button asChild variant="secondary">
            <Link href="/admin/catalog">Отменить</Link>
          </Button>
        </div>

        <p className="mt-4 max-w-[74ch] text-[12px] leading-relaxed text-muted">
          Название и описание вводятся на украинском — витрина одноязычная, текст попадает на
          страницу как есть.
        </p>
      </div>
    </form>
  )
}
