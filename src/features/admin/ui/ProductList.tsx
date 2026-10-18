'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { ProductStatus } from '@/db/enums'
import { setProductsStatusAction } from '@/features/admin/actions/catalog-actions'
import { errorText } from '@/features/admin/ui/messages'
import { ProductPublishToggle } from '@/features/admin/ui/ProductPublishToggle'
import { CatalogPositionCell } from '@/features/admin/ui/CatalogPositionCell'
import { WeightCell } from '@/features/admin/ui/WeightCell'
import type { AdminProductRow, AdminProductState } from '@/features/admin/queries/get-admin-catalog'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

// The state names as the admin reads them; out of stock stays visible in
// the row even though it is not a filter.
const STATE_LABELS: Record<AdminProductState, string> = {
  published: 'Опубликован',
  out_of_stock: 'Нет в наличии',
  draft: 'Черновик',
  category_hidden: 'Скрыт с категорией',
  archived: 'Архив',
}

const STATE_CLASSES: Record<AdminProductState, string> = {
  published: 'bg-accent-soft text-accent-hover',
  out_of_stock: 'bg-alert-soft text-alert',
  draft: 'bg-sunken text-muted',
  category_hidden: 'bg-sunken text-muted',
  archived: 'bg-sunken text-muted',
}

const headerCell = 'p-3 text-[12px] font-semibold whitespace-nowrap text-muted'

type ProductListProps = {
  readonly rows: readonly AdminProductRow[]
  readonly isArchive: boolean
}

export function ProductList({ rows, isArchive }: ProductListProps) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  // Only a product whose category is on the shop can be published on its own.
  const selectable = rows.filter((row) => !row.isCategoryHidden).map((row) => row.slug)
  const isAllSelected = selectable.length > 0 && selectable.every((slug) => selected.has(slug))

  function toggle(slug: string) {
    const next = new Set(selected)
    if (next.has(slug)) next.delete(slug)
    else next.add(slug)
    setSelected(next)
  }

  return (
    <div>
      {selected.size > 0 ? (
        <BulkBar
          slugs={[...selected]}
          isArchive={isArchive}
          onDone={() => setSelected(new Set())}
        />
      ) : null}

      <div className="overflow-x-auto rounded-card border border-subtle bg-surface">
        {/* Scrolls sideways on a phone rather than squeezing the names. */}
        <table className="w-full min-w-[860px] border-collapse text-[13.5px]">
          <thead>
            <tr className="bg-sunken text-left">
              <th className="w-10 p-3 pl-4">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  disabled={selectable.length === 0}
                  onChange={() => setSelected(isAllSelected ? new Set() : new Set(selectable))}
                  aria-label="Выбрать все на странице"
                  className="size-4 accent-[var(--color-ink)]"
                />
              </th>
              <th className={cn(headerCell, 'w-full')}>Товар</th>
              <th className={headerCell}>Артикул</th>
              <th className={cn(headerCell, 'text-right')}>Цена</th>
              <th className={cn(headerCell, 'text-right')}>Вес, кг</th>
              <th
                className={cn(headerCell, 'text-right')}
                title="Порядок в «Рекомендовані» на сайте"
              >
                Позиция
              </th>
              <th className={cn(headerCell, 'text-right')}>Остаток</th>
              <th className={headerCell}>Состояние</th>
              <th className={cn(headerCell, 'pr-4 text-right')}>Действие</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((product) => (
              <ProductRow
                key={product.slug}
                product={product}
                isSelected={selected.has(product.slug)}
                onToggle={() => toggle(product.slug)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

type BulkBarProps = {
  readonly slugs: readonly string[]
  readonly isArchive: boolean
  readonly onDone: () => void
}

// Acts on the ticked rows of this page; each direction asks first, since
// both change what buyers see within a minute.
function BulkBar({ slugs, isArchive, onDone }: BulkBarProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function apply(status: typeof ProductStatus.Published | typeof ProductStatus.Archived) {
    const question =
      status === ProductStatus.Published
        ? `Опубликовать выбранные товары (${slugs.length})? Они появятся на сайте в течение минуты.`
        : `Снять с публикации выбранные товары (${slugs.length})? Они уйдут в архив и исчезнут с сайта.`
    if (!window.confirm(question)) return

    setError(null)
    startTransition(async () => {
      const result = await setProductsStatusAction({ slugs, status }).catch(() => null)
      if (!result?.ok) {
        setError(result ? errorText(result.error) : 'Нет ответа от сервера — обновите страницу.')
        return
      }
      onDone()
      router.refresh()
    })
  }

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2.5 rounded-card border border-ink bg-ink px-4 py-2.5 text-on-dark">
      <span className="mr-auto text-[13px] font-semibold">Выбрано: {slugs.length}</span>
      {error ? <span className="text-[12.5px] text-alert-soft">{error}</span> : null}
      <Button size="sm" disabled={isPending} onClick={() => apply(ProductStatus.Published)}>
        Опубликовать
      </Button>
      {isArchive ? null : (
        <Button
          size="sm"
          variant="secondary"
          disabled={isPending}
          onClick={() => apply(ProductStatus.Archived)}
        >
          Снять с публикации
        </Button>
      )}
      <button
        type="button"
        onClick={onDone}
        disabled={isPending}
        className="px-2 text-[12.5px] font-semibold text-on-dark/80 hover:text-on-dark"
      >
        Сбросить
      </button>
    </div>
  )
}

type ProductRowProps = {
  readonly product: AdminProductRow
  readonly isSelected: boolean
  readonly onToggle: () => void
}

function ProductRow({ product, isSelected, onToggle }: ProductRowProps) {
  return (
    <tr className={cn('border-t border-subtle', isSelected && 'bg-accent-soft/40')}>
      <td className="p-3 pl-4">
        <input
          type="checkbox"
          checked={isSelected}
          disabled={product.isCategoryHidden}
          onChange={onToggle}
          aria-label={`Выбрать «${product.title}»`}
          className="size-4 accent-[var(--color-ink)]"
        />
      </td>
      <td className="p-3">
        <span className="flex items-center gap-3">
          <Thumb product={product} />
          <span className="min-w-0">
            <Link
              href={`/admin/catalog/${product.slug}`}
              className="font-medium text-ink hover:text-accent-hover hover:underline"
            >
              {product.title}
            </Link>
            <span className="block text-[12px] text-faint">
              {product.categoryName} · {variantsLabel(product.variants)}
            </span>
          </span>
        </span>
      </td>
      <td className="p-3 font-mono text-[12.5px] whitespace-nowrap text-muted">{product.sku}</td>
      <td className="p-3 text-right whitespace-nowrap">
        <span className="text-ink">{product.priceLabel}</span>
        {product.struckPriceLabel ? (
          <s className="block text-[11.5px] text-faint">{product.struckPriceLabel}</s>
        ) : null}
      </td>
      <td className="p-3 text-right">
        <WeightCell
          slug={product.slug}
          title={product.title}
          weightKgInput={product.weightKgInput}
        />
      </td>
      <td className="p-3 text-right">
        <CatalogPositionCell
          slug={product.slug}
          title={product.title}
          positionInput={product.catalogPositionInput}
        />
      </td>
      <td
        className={cn(
          'p-3 text-right font-semibold',
          product.stock === 0 ? 'text-alert' : 'text-ink',
        )}
      >
        {product.stock}
      </td>
      <td className="p-3">
        <span
          className={cn(
            'inline-block rounded-pill px-2.5 py-1.5 text-[11px] font-semibold whitespace-nowrap',
            STATE_CLASSES[product.state],
          )}
        >
          {STATE_LABELS[product.state]}
        </span>
      </td>
      <td className="p-3 pr-4 text-right">
        <ProductPublishToggle
          slug={product.slug}
          title={product.title}
          isPublished={product.isPublished}
          isCategoryHidden={product.isCategoryHidden}
          isCompact
        />
      </td>
    </tr>
  )
}

function Thumb({ product }: { readonly product: AdminProductRow }) {
  if (!product.coverUrl) {
    return (
      <span className="flex size-11 shrink-0 items-center justify-center rounded-chip border border-subtle bg-sunken text-[10px] text-faint">
        нет фото
      </span>
    )
  }

  return (
    <Image
      src={product.coverUrl}
      alt={product.coverAlt}
      width={44}
      height={44}
      sizes="44px"
      className="size-11 shrink-0 rounded-chip border border-subtle bg-sunken object-cover"
    />
  )
}

const ONE = 1
const FEW_MIN = 2
const FEW_MAX = 4
const TENS = 10
const HUNDREDS = 100
const TEEN_MIN = 11
const TEEN_MAX = 14

// Russian plural for the admin: 1 вариант, 2 варианта, 5 вариантов, 21 вариант.
function variantsLabel(count: number): string {
  const lastTwo = count % HUNDREDS
  const last = count % TENS
  if (lastTwo >= TEEN_MIN && lastTwo <= TEEN_MAX) return `${count} вариантов`
  if (last === ONE) return `${count} вариант`
  if (last >= FEW_MIN && last <= FEW_MAX) return `${count} варианта`
  return `${count} вариантов`
}
