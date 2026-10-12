'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Fragment, useState, useTransition, type DragEvent, type KeyboardEvent } from 'react'
import { reorderCategoriesAction } from '@/features/admin/actions/catalog-actions'
import type { AdminCategoryRow } from '@/features/admin/queries/get-admin-catalog'
import { CategoryDetailsEditor } from '@/features/admin/ui/CategoryDetailsEditor'
import { CategoryToggle } from '@/features/admin/ui/CategoryToggle'
import { errorText } from '@/features/admin/ui/messages'
import { cn } from '@/lib/utils'

const headerCell = 'p-3 text-[12px] font-semibold whitespace-nowrap text-muted'
const arrowClass =
  'inline-flex size-8 items-center justify-center rounded-control border border-subtle text-[13px] text-muted disabled:opacity-35'

const KEY_OFFSETS: Readonly<Record<string, -1 | 1>> = { ArrowUp: -1, ArrowDown: 1 }

type CategoryTableProps = {
  readonly categories: readonly AdminCategoryRow[]
}

// The order here is the order in the site header. Rows are dragged by the
// handle on a desktop, or moved with ↑/↓ once the handle has focus; on a
// phone, where dragging is not available, the arrows beside the name do the
// same.
export function CategoryTable({ categories }: CategoryTableProps) {
  const router = useRouter()
  const [order, setOrder] = useState<readonly AdminCategoryRow[]>(categories)
  const [dragged, setDragged] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function save(next: readonly AdminCategoryRow[]) {
    const previous = order
    setOrder(next)
    setError(null)
    startTransition(async () => {
      const result = await reorderCategoriesAction({
        slugs: next.map((category) => category.slug),
      }).catch(() => null)
      if (!result?.ok) {
        setOrder(previous)
        setError(result ? errorText(result.error) : 'Нет ответа от сервера — обновите страницу.')
        return
      }
      router.refresh()
    })
  }

  function moveTo(slug: string, targetIndex: number) {
    if (isPending) return
    const from = order.findIndex((category) => category.slug === slug)
    const moved = order[from]
    if (!moved || from === targetIndex || targetIndex < 0 || targetIndex >= order.length) return
    const next = order.filter((category) => category.slug !== slug)
    save([...next.slice(0, targetIndex), moved, ...next.slice(targetIndex)])
  }

  function startDrag(event: DragEvent, slug: string) {
    // Firefox starts a drag only when something is put on it.
    event.dataTransfer.setData('text/plain', slug)
    event.dataTransfer.effectAllowed = 'move'
    setDragged(slug)
  }

  function moveByKey(event: KeyboardEvent, slug: string, index: number) {
    const offset = KEY_OFFSETS[event.key]
    if (offset === undefined) return
    event.preventDefault()
    moveTo(slug, index + offset)
  }

  function dropOn(event: DragEvent, targetIndex: number) {
    event.preventDefault()
    if (dragged) moveTo(dragged, targetIndex)
    setDragged(null)
  }

  return (
    <div>
      {error ? <p className="mb-2.5 text-[12.5px] font-medium text-alert">{error}</p> : null}
      <div className="overflow-x-auto rounded-card border border-subtle bg-surface">
        {/* Scrolls sideways on a phone rather than squeezing the names. */}
        <table className="w-full min-w-[680px] border-collapse text-[13.5px]">
          <thead>
            <tr className="bg-sunken text-left">
              <th className="w-10 p-3 pl-4" aria-label="Порядок" />
              <th className={cn(headerCell, 'w-full')}>Категория</th>
              <th className={cn(headerCell, 'text-right')}>Опубликовано</th>
              <th className={cn(headerCell, 'text-right')}>Черновики</th>
              <th className={headerCell}>Состояние</th>
              <th className={cn(headerCell, 'pr-4 text-right')}>Действие</th>
            </tr>
          </thead>
          <tbody>
            {order.map((category, index) => (
              <Fragment key={category.slug}>
                <tr
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => dropOn(event, index)}
                  className={cn(
                    'border-t border-subtle',
                    dragged === category.slug && 'opacity-40',
                    isPending && 'pointer-events-none',
                  )}
                >
                  <td className="p-3 pl-4">
                    {/* A span, not a button: Firefox never starts a drag from a
                        <button>. Focusable, so ↑/↓ move the row from the keyboard. */}
                    <span
                      role="button"
                      tabIndex={0}
                      draggable
                      onDragStart={(event) => startDrag(event, category.slug)}
                      onDragEnd={() => setDragged(null)}
                      onKeyDown={(event) => moveByKey(event, category.slug, index)}
                      aria-label={`Порядок «${category.name}»: ${index + 1} из ${order.length}. Стрелки вверх и вниз двигают категорию.`}
                      title="Перетащите или нажмите ↑/↓, чтобы изменить порядок"
                      className="hidden cursor-grab rounded-control px-1 text-[16px] text-faint select-none hover:text-ink sm:inline"
                    >
                      ⠿
                    </span>
                    <span className="flex flex-col gap-1 sm:hidden">
                      <button
                        type="button"
                        aria-label={`Поднять «${category.name}»`}
                        disabled={index === 0}
                        onClick={() => moveTo(category.slug, index - 1)}
                        className={arrowClass}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label={`Опустить «${category.name}»`}
                        disabled={index === order.length - 1}
                        onClick={() => moveTo(category.slug, index + 1)}
                        className={arrowClass}
                      >
                        ↓
                      </button>
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="block font-semibold text-ink">{category.name}</span>
                    <span className="block text-[12px] text-faint">/{category.slug}</span>
                  </td>
                  <td className="p-3 text-right text-ink">{category.published}</td>
                  <td className="p-3 text-right text-muted">{category.drafts}</td>
                  <td className="p-3">
                    <span
                      className={cn(
                        'inline-block rounded-pill px-2.5 py-1.5 text-[11px] font-semibold whitespace-nowrap',
                        category.isVisible
                          ? 'bg-accent-soft text-accent-hover'
                          : 'bg-sunken text-muted',
                      )}
                    >
                      {category.isVisible ? 'Опубликована' : 'Скрыта'}
                    </span>
                  </td>
                  <td className="p-3 pr-4 text-right whitespace-nowrap">
                    <Link
                      href={`/admin/catalog?category=${encodeURIComponent(category.slug)}`}
                      className="mr-4 text-[12.5px] font-semibold text-ink hover:text-accent-hover hover:underline"
                    >
                      Открыть товары
                    </Link>
                    <button
                      type="button"
                      onClick={() => setEditing(editing === category.slug ? null : category.slug)}
                      aria-expanded={editing === category.slug}
                      className="text-[12.5px] font-semibold text-accent-hover hover:underline"
                    >
                      {editing === category.slug ? 'Свернуть' : 'Править'}
                    </button>
                  </td>
                </tr>
                {editing === category.slug ? (
                  <tr className="bg-sunken">
                    <td colSpan={6} className="p-4">
                      <CategoryEditPanel category={category} />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CategoryEditPanel({ category }: { readonly category: AdminCategoryRow }) {
  return (
    <div className="grid gap-4">
      <CategoryDetailsEditor
        categoryId={category.id}
        name={category.name}
        description={category.description}
        seoTitle={category.seoTitle}
        seoDescription={category.seoDescription}
        seoText={category.seoText}
        faq={category.faq}
        googleProductCategory={category.googleProductCategory}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-subtle pt-3.5">
        <p className="max-w-[60ch] text-[12.5px] leading-relaxed text-muted">
          {category.isVisible
            ? 'Скрытая категория уходит из хедера, фильтров и поиска вместе со всеми товарами.'
            : 'Категория скрыта: её товары недоступны, прямые ссылки отдают 404.'}
        </p>
        <CategoryToggle slug={category.slug} isVisible={category.isVisible} />
      </div>
    </div>
  )
}
