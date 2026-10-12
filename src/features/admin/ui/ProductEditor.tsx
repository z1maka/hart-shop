'use client'

import Link from 'next/link'
import { useActionState, useEffect, useRef, useState } from 'react'
import { saveProductAction, type SaveProductResult } from '@/features/admin/actions/product-actions'
import { ProductPublishToggle } from '@/features/admin/ui/ProductPublishToggle'
import { ProductPhotos } from '@/features/admin/ui/ProductPhotos'
import { ProductSpecsEditor } from '@/features/admin/ui/ProductSpecsEditor'
import { VariantCoverPicker } from '@/features/admin/ui/VariantCoverPicker'
import {
  discountPercent,
  hryvniasToKopiykas,
  nextSlug,
  parseDecimalInput,
} from '@/features/admin/model/product-form'
import { createMoney, Currency, formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import { GoogleCategorySelect } from '@/features/admin/ui/GoogleCategorySelect'
import { findGoogleCategory } from '@/features/catalog/model/google-category'
import type {
  ProductEditorCategory,
  ProductEditorView,
} from '@/features/admin/queries/get-product-draft'
import { errorText } from '@/features/admin/ui/messages'
import { Button } from '@/components/ui/Button'
import { Field, inputClassName, textareaClassName } from '@/components/ui/Field'

type ProductEditorProps = {
  readonly product: ProductEditorView
  readonly siteHost: string
  // The build this form was rendered by; the save refuses another one.
  readonly formVersion: string
}

export function ProductEditor({ product, siteHost, formVersion }: ProductEditorProps) {
  const [price, setPrice] = useState(product.priceInput)
  const [salePrice, setSalePrice] = useState(product.salePriceInput)
  const [weight, setWeight] = useState(product.weightInput)
  const [slug, setSlug] = useState(product.slug)
  const [categoryId, setCategoryId] = useState(product.categoryId)
  const [isDirty, setIsDirty] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const [result, submit, isPending] = useActionState<SaveProductResult | null, FormData>(
    async (previous, formData) => {
      const next = await saveProductAction(previous, formData)
      if (next.ok) setIsDirty(false)
      return next
    },
    null,
  )

  // The browser prompt covers reloads and closed tabs; the cancel link below
  // covers in-app navigation, which never fires beforeunload.
  useEffect(() => {
    if (!isDirty) return

    function warn(event: BeforeUnloadEvent) {
      event.preventDefault()
    }

    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [isDirty])

  // Failed saves reset uncontrolled fields (React 19), so the typed values
  // ride back on the result and win over the stored ones.
  const typed = result && !result.ok ? (result.values ?? {}) : {}
  const invalid = result && !result.ok && result.error.code === 'VALIDATION_FAILED' ? result.error : null
  const fieldError = (name: string): string | undefined =>
    invalid?.message === name ? (invalid.hint ?? 'проверьте значение') : undefined

  // The field the save tripped on comes into view with the cursor in it; a
  // red word at the top of a long form is easy to miss.
  useEffect(() => {
    if (!invalid) return

    const field = formRef.current?.querySelector<HTMLElement>('[data-invalid="true"]')
    field?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    field?.querySelector<HTMLElement>('input, select, textarea')?.focus({ preventScroll: true })
  }, [invalid])
  // React 19 resets the form once the action settles, and a <select> takes
  // its defaultValue only when it mounts: the reset would bring back the
  // option the page opened with. Each select below is keyed by the value it
  // should show — the one typed into a failed save, else the stored one —
  // so a save that changes it remounts the select on the right option.
  const categoryDefault = typed.categoryId ?? product.categoryId
  const googleCategoryDefault = typed.googleProductCategory ?? product.googleCategoryInput
  const layersDefault = Number(typed.layers ?? product.layers)

  const category = product.categories.find((option) => option.id === categoryId)

  return (
    <form ref={formRef} action={submit} onInput={() => setIsDirty(true)}>
      <input type="hidden" name="currentSlug" value={product.slug} />
      <input type="hidden" name="formVersion" value={formVersion} />

      <div className="mb-5.5 flex flex-wrap items-end justify-between gap-3.5">
        <div>
          <Link
            href="/admin/catalog"
            className="mb-2 inline-block text-[12.5px] font-semibold text-accent-hover hover:underline"
          >
            ← К каталогу
          </Link>
          <h1 className="mb-1.5 font-display text-h2 font-bold text-ink">{product.title}</h1>
          <p className="text-[12.5px] text-muted">{product.sku}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {result && !result.ok ? (
            <span className="text-[12.5px] text-alert">{errorText(result.error)}</span>
          ) : null}
          {result?.ok ? <span className="text-[12.5px] text-accent-hover">Сохранено</span> : null}
          <Button asChild variant="secondary">
            <Link
              href="/admin/catalog"
              onClick={(event) => {
                if (
                  isDirty &&
                  !window.confirm('Есть несохранённые изменения. Уйти без сохранения?')
                ) {
                  event.preventDefault()
                }
              }}
            >
              Отменить
            </Link>
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Сохраняем…' : 'Сохранить'}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-5">
        <div className="grid min-w-[min(100%,320px)] flex-[999_1_460px] gap-5">
          <EditorCard title="Основное">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-4">
              <Field error={fieldError('sku')} label="Артикул">
                <input
                  name="sku"
                  defaultValue={typed.sku ?? product.sku}
                  className={inputClassName}
                  required
                />
              </Field>
              <Field error={fieldError('categoryId')} label="Категория">
                <select
                  key={categoryDefault}
                  name="categoryId"
                  defaultValue={categoryDefault}
                  onChange={(event) => setCategoryId(event.target.value)}
                  className={inputClassName}
                >
                  {product.categories.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.isVisible ? option.name : `${option.name} (скрыта)`}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                error={fieldError('googleProductCategory')}
                label="Категория Google для рекламы"
                className="col-span-full"
              >
                <GoogleCategorySelect
                  key={googleCategoryDefault}
                  name="googleProductCategory"
                  defaultValue={googleCategoryDefault}
                  emptyLabel={`Как у категории: ${categoryGoogleLabel(category)}`}
                />
              </Field>
              <Field error={fieldError('title')} label="Название на витрине" className="col-span-full">
                <input
                  name="title"
                  defaultValue={typed.title ?? product.title}
                  className={inputClassName}
                  required
                />
              </Field>
              <Field error={fieldError('shortTitle')} label="Короткое название для списков" className="col-span-full">
                <input
                  name="shortTitle"
                  defaultValue={typed.shortTitle ?? product.shortTitle}
                  maxLength={80}
                  placeholder="Пусто — в списках печатается полное название"
                  className={inputClassName}
                />
              </Field>
              <Field error={fieldError('description')} label="Описание на витрине" className="col-span-full">
                <textarea
                  name="description"
                  rows={4}
                  defaultValue={typed.description ?? product.description}
                  className={textareaClassName}
                  required
                />
              </Field>
              <Field error={fieldError('seoTitle')} label="Заголовок в Google" className="col-span-full">
                <input
                  name="seoTitle"
                  defaultValue={typed.seoTitle ?? product.seoTitle}
                  maxLength={70}
                  placeholder="Пусто — название на витрине"
                  className={inputClassName}
                />
              </Field>
              <Field error={fieldError('seoDescription')} label="Описание в Google (до 160 знаков)" className="col-span-full">
                <textarea
                  name="seoDescription"
                  rows={2}
                  defaultValue={typed.seoDescription ?? product.seoDescription}
                  maxLength={160}
                  placeholder="Пусто — начало описания на витрине"
                  className={textareaClassName}
                />
              </Field>
            </div>

            {category && !category.isVisible ? (
              <p className="mt-3.5 rounded-[10px] border border-alert-edge bg-alert-soft px-3.5 py-3 text-[12.5px] leading-relaxed text-alert">
                Категория сейчас скрыта — товар не появится на витрине даже после публикации. Это
                нормально при подготовке к запуску.
              </p>
            ) : null}

            <EditorNote>
              Витрина одноязычная: название и описание вводятся на украинском и попадают на страницу
              как есть. Артикул служит идентификатором в счетах и накладных, поэтому менять его
              после первой продажи не стоит.
            </EditorNote>
          </EditorCard>

          <EditorCard title="Цена и склад">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(160px,100%),1fr))] gap-4">
              <Field error={fieldError('price')} label="Обычная цена, грн">
                <input
                  name="price"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  inputMode="decimal"
                  className={inputClassName}
                  required
                />
              </Field>
              <Field error={fieldError('salePrice')} label="Цена со скидкой, грн">
                <input
                  name="salePrice"
                  value={salePrice}
                  onChange={(event) => setSalePrice(event.target.value)}
                  inputMode="decimal"
                  placeholder="Без скидки"
                  className={inputClassName}
                />
              </Field>
              <Field error={fieldError('wholesalePrice')} label="Оптовая цена, грн">
                <input
                  name="wholesalePrice"
                  defaultValue={typed.wholesalePrice ?? product.wholesalePriceInput}
                  inputMode="decimal"
                  placeholder="Без опта"
                  className={inputClassName}
                />
              </Field>
              <Field error={fieldError('wholesaleMinQty')} label="Опт от, шт">
                <input
                  name="wholesaleMinQty"
                  defaultValue={typed.wholesaleMinQty ?? product.wholesaleMinQtyInput}
                  inputMode="numeric"
                  placeholder="например, 10"
                  className={inputClassName}
                />
              </Field>
              <Field error={fieldError('weight')} label="Вес, кг">
                <input
                  name="weight"
                  value={weight}
                  onChange={(event) => setWeight(event.target.value)}
                  inputMode="decimal"
                  className={inputClassName}
                  required
                />
              </Field>
            </div>

            <div className="mt-4.5 grid gap-2.5">
              <p className="text-[12.5px] font-semibold text-muted">Варианты: остаток и фото</p>
              {fieldError('variantStock') || fieldError('variantCover') ? (
                <p className="text-[12px] font-medium text-alert" data-invalid="true">
                  {fieldError('variantStock') ?? fieldError('variantCover')}
                </p>
              ) : null}
              {product.variants.map((variant) => (
                <div
                  key={variant.id}
                  className="grid gap-2.5 rounded-control border border-subtle bg-sunken px-3.5 py-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-[13px] text-ink">
                      {variant.label}
                      <span className="ml-2 text-[12px] text-faint">{variant.sku}</span>
                    </span>
                    <input type="hidden" name="variantId" value={variant.id} />
                    <input
                      name="variantStock"
                      type="number"
                      min={0}
                      defaultValue={variant.stock}
                      aria-label={`Остаток: ${variant.label}`}
                      className="min-h-10 w-24 rounded-control border-[1.5px] border-strong bg-raised px-3 text-right text-[14px] text-ink"
                    />
                  </div>
                  <VariantCoverPicker
                    variantLabel={variant.label}
                    images={product.images}
                    initialStorageKey={variant.coverStorageKey}
                    onChange={() => setIsDirty(true)}
                  />
                </div>
              ))}
            </div>

            <StorefrontPrice price={price} salePrice={salePrice} />

            <EditorNote>
              Если заполнить «Цену со скидкой», покупатель платит её, а обычная цена показывается на
              витрине зачёркнутой. Чтобы убрать скидку — очистите поле и сохраните. Фото у варианта
              — это кадр, который Google показывает в объявлении этого цвета и на который
              переключается галерея при выборе цвета; без выбора берётся главное фото товара.
            </EditorNote>
          </EditorCard>

          <EditorCard title="Характеристики">
            <ProductSpecsEditor
              specs={product.specs}
              layers={layersDefault}
              layersError={fieldError('layers')}
              onChange={() => setIsDirty(true)}
            />

            <EditorNote>
              Строки выводятся на странице товара в этом порядке; строка с пустым названием или
              значением не сохраняется. «Слои ткани» — отдельный выбор: по нему на странице товара
              появляется блок «Шари тканини», подпись «3 шари» и строка в сравнении. Для шлемов,
              наушников, рюкзаков — «Нет».
            </EditorNote>
          </EditorCard>

          <EditorCard title="Фотографии">
            <ProductPhotos slug={product.slug} images={product.images} />

            <EditorNote>
              Первое фото — главное: оно идёт в каталог, поиск и разметку для поисковых систем.
              Каждый файл превращается в два WebP: кадр целиком для страницы товара и квадратный
              кроп для сетки. Большие фото уменьшаются в браузере перед отправкой.
            </EditorNote>
          </EditorCard>

          <EditorCard title="Адрес и поиск">
            <Field error={fieldError('slug')} label="Адрес страницы">
              <input
                name="slug"
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                className={inputClassName}
                required
              />
            </Field>
            <p className="mt-3.5 mb-4 rounded-control bg-sunken px-3.5 py-2.5 font-display text-[12.5px] text-muted normal-case">
              {siteHost}/product/{nextSlug(product.slug, slug) || 'novyy-tovar'}
            </p>
            <SummaryField defaultValue={typed.summary ?? product.summary} error={fieldError('summary')} />

            <EditorNote>
              Адрес страницы после публикации лучше не менять: старые ссылки перестают работать, а
              позиции в поиске обнуляются. Если менять всё же нужно, ставьте редирект со старого
              адреса.
            </EditorNote>
          </EditorCard>
        </div>

        <div className="grid min-w-[min(100%,280px)] flex-[1_1_300px] gap-4">
          <div className="rounded-card border border-subtle bg-surface p-5">
            <p className="mb-3 text-[12.5px] font-semibold text-muted">Публикация</p>
            <ProductPublishToggle
              slug={product.slug}
              title={product.title}
              isPublished={product.isPublished}
              isCategoryHidden={category ? !category.isVisible : false}
            />
            <p className="mt-3.5 text-[12px] leading-relaxed text-muted">
              Черновик виден только здесь. Публикация выводит товар в каталог, поиск и карту сайта в
              течение минуты.
            </p>
          </div>
        </div>
      </div>
    </form>
  )
}

function EditorCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-subtle bg-surface p-5.5">
      <h2 className="mb-4 font-display text-[16px] font-bold text-ink">{title}</h2>
      {children}
    </section>
  )
}

const SUMMARY_MAX_LENGTH = 300
const SUMMARY_BEST_LENGTH = 160

// Two or three sentences: the buyer reads them under the price, Google shows
// them in the result. Google cuts around 160 characters, hence the count.
function SummaryField({
  defaultValue,
  error,
}: {
  readonly defaultValue: string
  readonly error?: string
}) {
  const [value, setValue] = useState(defaultValue)
  const length = value.trim().length
  const isLong = length > SUMMARY_BEST_LENGTH

  return (
    <Field label="Краткое описание" error={error}>
      <textarea
        name="summary"
        rows={3}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        maxLength={SUMMARY_MAX_LENGTH}
        placeholder="Что это, для кого и чем отличается от других моделей."
        className={textareaClassName}
      />
      <p className={cn('mt-1.5 text-[12px]', isLong ? 'text-alert' : 'text-muted')}>
        {length} из {SUMMARY_BEST_LENGTH} символов
        {isLong ? ' — в результатах Google остальное обрежется' : ''}
      </p>
    </Field>
  )
}

function EditorNote({ children }: { children: React.ReactNode }) {
  return <p className="mt-3.5 max-w-[74ch] text-[12px] leading-relaxed text-muted">{children}</p>
}

function kopiykasOf(input: string): number | null {
  const value = parseDecimalInput(input)
  return value !== null && value > 0 ? hryvniasToKopiykas(value) : null
}

function hryvnias(cents: number): string {
  return formatMoney(createMoney(cents, Currency.Uah))
}

// What the buyer will see once saved — the struck-through price included.
function StorefrontPrice({ price, salePrice }: { price: string; salePrice: string }) {
  const priceCents = kopiykasOf(price)
  if (priceCents === null) return null

  const saleCents = kopiykasOf(salePrice)
  const percent = discountPercent(priceCents, saleCents)
  const isSaleTyped = salePrice.trim() !== ''

  return (
    <p className="mt-4 rounded-control bg-sunken px-3.5 py-2.5 text-[13px] text-ink">
      На витрине:{' '}
      {percent !== null && saleCents !== null ? (
        <>
          <span className="font-semibold">{hryvnias(saleCents)}</span>{' '}
          <s className="text-muted">{hryvnias(priceCents)}</s>{' '}
          <span className="text-accent-hover">−{percent}%</span>
        </>
      ) : (
        <span className="font-semibold">{hryvnias(priceCents)}</span>
      )}
      {isSaleTyped && percent === null ? (
        <span className="ml-2 text-alert">цена со скидкой должна быть меньше обычной</span>
      ) : null}
    </p>
  )
}

// What «как у категории» resolves to, so the admin sees the effective choice
// without opening the category.
function categoryGoogleLabel(category: ProductEditorCategory | undefined): string {
  return findGoogleCategory(category?.googleProductCategory ?? null)?.label ?? 'не указана'
}
