'use client'

import Image from 'next/image'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  saveFeaturedAction,
  searchFeaturedAction,
  setFeaturedModeAction,
} from '@/features/admin/actions/storefront-actions'
import { errorText } from '@/features/admin/ui/messages'
import { FeaturedMode } from '@/config/storefront'
import type { FeaturedBoardItem } from '@/features/admin/queries/get-storefront'
import { Button } from '@/components/ui/Button'
import { inputClassName } from '@/components/ui/Field'
import { cn } from '@/lib/utils'

type FeaturedBoardProps = {
  readonly initialItems: readonly FeaturedBoardItem[]
  readonly initialMode: FeaturedMode
  readonly limit: number
}

const PREVIEW_COUNT = 4

// The shop window, arranged by hand: what sits in the rail on the home page
// and what opens the catalogue. Every change is saved as the whole order —
// a rail is a sequence, not a set of independent rows.
export function FeaturedBoard({ initialItems, initialMode, limit }: FeaturedBoardProps) {
  const router = useRouter()
  const [items, setItems] = useState<readonly FeaturedBoardItem[]>(initialItems)
  const [mode, setMode] = useState<FeaturedMode>(initialMode)
  const [term, setTerm] = useState('')
  const [candidates, setCandidates] = useState<readonly FeaturedBoardItem[]>([])
  const [dragged, setDragged] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function persist(next: readonly FeaturedBoardItem[]) {
    setItems(next)
    setError(null)
    startTransition(async () => {
      const result = await saveFeaturedAction({ slugs: next.map((item) => item.slug) })
      if (!result.ok) {
        setError(errorText(result.error))
        return
      }
      router.refresh()
    })
  }

  function move(index: number, step: number) {
    const target = index + step
    if (target < 0 || target >= items.length) return

    const next = [...items]
    const [moved] = next.splice(index, 1)
    if (moved) next.splice(target, 0, moved)
    persist(next)
  }

  function dropOn(index: number) {
    const from = items.findIndex((item) => item.slug === dragged)
    setDragged(null)
    if (from === -1 || from === index) return

    const next = [...items]
    const [moved] = next.splice(from, 1)
    if (moved) next.splice(index, 0, moved)
    persist(next)
  }

  function search(value: string) {
    setTerm(value)
    startTransition(async () => {
      const result = await searchFeaturedAction({ term: value })
      setCandidates(result.ok ? result.data : [])
    })
  }

  function changeMode(next: FeaturedMode) {
    setMode(next)
    startTransition(async () => {
      await setFeaturedModeAction({ mode: next })
      router.refresh()
    })
  }

  const isFull = items.length >= limit

  return (
    <div className="flex flex-wrap items-start gap-6">
      <div className="min-w-[min(100%,360px)] flex-[999_1_560px]">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="mb-1.5 font-display text-[19px] font-bold text-ink">Хиты продаж</h1>
            <p className="max-w-[62ch] text-[13px] leading-relaxed text-muted">
              На главной показываются первые {limit} в этом порядке. В режиме «Автоматически»
              витрина сама берёт по товару из каждой основной категории, а этот список сохраняется.
            </p>
          </div>
          <div className="flex gap-1 rounded-[10px] bg-hover p-1">
            {[FeaturedMode.Manual, FeaturedMode.Auto].map((entry) => (
              <button
                key={entry}
                type="button"
                onClick={() => changeMode(entry)}
                className={cn(
                  'inline-flex min-h-9.5 items-center rounded-chip px-3.5 text-[12.5px] font-semibold transition-colors',
                  mode === entry ? 'bg-ink text-on-dark' : 'text-ink hover:bg-surface',
                )}
              >
                {entry === FeaturedMode.Manual ? 'Вручную' : 'Автоматически'}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <p className="mb-3 rounded-card border border-alert-edge bg-alert-soft px-4 py-3 text-[12.5px] font-medium text-alert">
            {error}
          </p>
        ) : null}

        <div className="rounded-card border border-subtle bg-surface">
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-subtle px-5 py-3.5">
            <p className="text-[13px] font-semibold text-ink">
              В блоке · {items.length} из {limit}
            </p>
            <p className="text-[12px] text-faint">Перетащите за ⠿ или стрелками</p>
          </div>

          {items.length === 0 ? (
            <p className="px-5 py-8 text-center text-[13px] text-muted">
              Список пуст — витрина сама соберёт ленту по категориям.
            </p>
          ) : (
            <ol>
              {items.map((item, index) => (
                <li
                  key={item.slug}
                  draggable
                  onDragStart={() => setDragged(item.slug)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => dropOn(index)}
                  className={cn(
                    'flex flex-wrap items-center gap-3 border-t border-subtle px-4 py-3 first:border-t-0',
                    dragged === item.slug && 'opacity-50',
                  )}
                >
                  <span className="cursor-grab text-[15px] text-faint" aria-hidden>
                    ⠿
                  </span>
                  <span className="w-5 text-center text-[13px] font-semibold text-muted">
                    {index + 1}
                  </span>
                  <Thumb item={item} />
                  <span className="min-w-[min(100%,180px)] flex-[999_1_200px]">
                    <span className="block text-[13.5px] font-semibold text-ink">{item.title}</span>
                    <span className="block text-[12px] text-faint">{item.categoryName}</span>
                  </span>
                  <span className="text-[13px] font-semibold whitespace-nowrap text-ink">
                    {item.priceLabel}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MoveButton label="Выше" onClick={() => move(index, -1)} disabled={index === 0}>
                      ↑
                    </MoveButton>
                    <MoveButton
                      label="Ниже"
                      onClick={() => move(index, 1)}
                      disabled={index === items.length - 1}
                    >
                      ↓
                    </MoveButton>
                    <button
                      type="button"
                      onClick={() => persist(items.filter((entry) => entry.slug !== item.slug))}
                      className="px-2 text-[12.5px] font-semibold text-muted hover:text-alert"
                    >
                      Убрать
                    </button>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="mt-4 rounded-card border border-subtle bg-surface p-5">
          <p className="mb-3 text-[13px] font-semibold text-ink">Добавить товар</p>
          <input
            value={term}
            onChange={(event) => search(event.target.value)}
            placeholder="Поиск по названию или артикулу"
            className={cn(inputClassName, 'w-full font-normal')}
          />

          {isFull ? (
            <p className="mt-3 text-[12.5px] text-alert">
              В блоке уже {limit} товаров — уберите один, чтобы добавить другой.
            </p>
          ) : null}

          <ul className="mt-3 grid gap-2">
            {candidates.map((candidate) => (
              <li
                key={candidate.slug}
                className="flex flex-wrap items-center gap-3 rounded-[10px] border border-subtle px-3.5 py-2.5"
              >
                <Thumb item={candidate} />
                <span className="min-w-[min(100%,180px)] flex-[999_1_200px]">
                  <span className="block text-[13px] font-semibold text-ink">{candidate.title}</span>
                  <span className="block text-[12px] text-faint">
                    {candidate.categoryName} · {candidate.priceLabel}
                  </span>
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={isFull || isPending}
                  onClick={() => {
                    persist([...items, candidate])
                    setCandidates(candidates.filter((entry) => entry.slug !== candidate.slug))
                  }}
                >
                  + В хиты
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <aside className="min-w-[min(100%,280px)] flex-[1_1_320px]">
        <p className="mb-2.5 text-[11.5px] font-semibold tracking-[0.06em] text-faint uppercase">
          Так увидит покупатель
        </p>
        <div className="rounded-card border border-subtle bg-surface p-5">
          <p className="mb-3.5 font-display text-[17px] font-bold text-ink">Хіти продажів</p>
          <div className="grid grid-cols-2 gap-3">
            {items.slice(0, PREVIEW_COUNT).map((item) => (
              <div key={item.slug} className="rounded-[10px] border border-subtle p-2.5">
                <div className="relative mb-2 aspect-square overflow-hidden rounded-[8px] bg-sunken">
                  {item.imageUrl ? (
                    <Image src={item.imageUrl} alt="" fill sizes="120px" className="object-cover" />
                  ) : null}
                </div>
                <p className="line-clamp-2 text-[12px] leading-snug font-semibold text-ink">
                  {item.title}
                </p>
                <p className="mt-0.5 text-[12px] text-muted">{item.priceLabel}</p>
              </div>
            ))}
          </div>
          <p className="mt-3.5 text-[12px] text-faint">
            Первые {PREVIEW_COUNT} из {limit} · на сайте — горизонтальная лента
          </p>
        </div>
      </aside>
    </div>
  )
}

function Thumb({ item }: { readonly item: FeaturedBoardItem }) {
  return (
    <span className="relative block size-11 shrink-0 overflow-hidden rounded-[8px] bg-sunken">
      {item.imageUrl ? (
        <Image src={item.imageUrl} alt="" fill sizes="44px" className="object-cover" />
      ) : null}
    </span>
  )
}

function MoveButton({
  label,
  onClick,
  disabled,
  children,
}: {
  readonly label: string
  readonly onClick: () => void
  readonly disabled: boolean
  readonly children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="inline-flex size-8 items-center justify-center rounded-[8px] border border-subtle text-[13px] text-ink disabled:opacity-40"
    >
      {children}
    </button>
  )
}
