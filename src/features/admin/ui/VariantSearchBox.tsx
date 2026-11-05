'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { SalesChannel } from '@/db/enums'
import { findOrderVariantsAction } from '@/features/admin/actions/order-actions'
import { errorText } from '@/features/admin/ui/messages'
import type { AddableVariant } from '@/features/orders'
import { VARIANT_SEARCH_LIMIT, VARIANT_SEARCH_MIN_LENGTH } from '@/features/orders/model/order-edit'
import { inputClassName } from '@/components/ui/Field'
import { createMoney, Currency, formatMoney, formatWholeMoney } from '@/lib/money'
import { cn } from '@/lib/utils'

// The admin types and the matches open under the field, as they type: a name,
// a SKU or a price. Escape, a click elsewhere, the cross or an emptied field
// close the list; a late answer to an older query never replaces a newer one.

type VariantSearchBoxProps = {
  // Prices the matches as the order will: retail on a site order, the drop
  // price on a partner's.
  readonly channel: SalesChannel
  readonly onPick: (variant: AddableVariant) => void
}

type Matches =
  | { readonly state: 'loading' }
  | { readonly state: 'failed'; readonly message: string }
  | { readonly state: 'found'; readonly variants: readonly AddableVariant[] }

// Long enough to let a word be typed, short enough to feel immediate.
const SEARCH_DEBOUNCE_MS = 250

export function VariantSearchBox({ channel, onPick }: VariantSearchBoxProps) {
  const listId = useId()
  const box = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const latestRequest = useRef(0)
  const [query, setQuery] = useState('')
  const [matches, setMatches] = useState<Matches | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  useEffect(() => () => clearTimeout(timer.current), [])

  useEffect(() => {
    if (!isOpen) return

    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Node && box.current?.contains(event.target)) return
      setIsOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [isOpen])

  async function search(text: string) {
    latestRequest.current += 1
    const request = latestRequest.current
    const result = await findOrderVariantsAction({ search: text, channel })
    if (request !== latestRequest.current) return

    if (!result.ok) {
      setMatches({ state: 'failed', message: errorText(result.error) })
      return
    }
    setMatches({ state: 'found', variants: result.data })
    setActiveIndex(result.data.findIndex((variant) => isPickable(variant)))
  }

  function changeQuery(next: string) {
    setQuery(next)
    clearTimeout(timer.current)
    const text = next.trim()
    if (text.length < VARIANT_SEARCH_MIN_LENGTH) {
      // An answer still on its way belongs to text that is gone.
      latestRequest.current += 1
      setMatches(null)
      setIsOpen(false)
      return
    }

    setMatches({ state: 'loading' })
    setIsOpen(true)
    timer.current = setTimeout(() => void search(text), SEARCH_DEBOUNCE_MS)
  }

  function pick(variant: AddableVariant) {
    if (!isPickable(variant)) return
    onPick(variant)
    setIsOpen(false)
  }

  const found = matches?.state === 'found' ? matches.variants : []

  function moveActive(step: 1 | -1) {
    const pickable = found.flatMap((variant, index) => (isPickable(variant) ? [index] : []))
    if (pickable.length === 0) return

    const at = pickable.indexOf(activeIndex)
    const next = at === -1 ? 0 : (at + step + pickable.length) % pickable.length
    setActiveIndex(pickable[next] ?? -1)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setIsOpen(false)
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!isOpen && matches) {
        setIsOpen(true)
        return
      }
      moveActive(event.key === 'ArrowDown' ? 1 : -1)
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      const active = found[activeIndex]
      if (isOpen && active) pick(active)
    }
  }

  return (
    <div ref={box} className="relative">
      <div className="relative">
        <input
          role="combobox"
          aria-label="Поиск товара"
          aria-expanded={isOpen}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={isOpen && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
          value={query}
          onChange={(event) => changeQuery(event.target.value)}
          onFocus={() => setIsOpen(matches !== null)}
          onClick={() => setIsOpen(matches !== null)}
          onKeyDown={onKeyDown}
          placeholder="Добавить товар: название, артикул или цена"
          autoComplete="off"
          className={cn(inputClassName, 'w-full pr-10')}
        />
        {query ? (
          <button
            type="button"
            aria-label="Очистить поиск"
            onClick={() => changeQuery('')}
            className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-[15px] text-muted hover:bg-hover hover:text-ink"
          >
            ✕
          </button>
        ) : null}
      </div>
      {isOpen && matches ? (
        <MatchesList
          listId={listId}
          channel={channel}
          matches={matches}
          activeIndex={activeIndex}
          onActive={setActiveIndex}
          onPick={pick}
        />
      ) : null}
    </div>
  )
}

type MatchesListProps = {
  readonly listId: string
  readonly channel: SalesChannel
  readonly matches: Matches
  readonly activeIndex: number
  readonly onActive: (index: number) => void
  readonly onPick: (variant: AddableVariant) => void
}

function MatchesList({
  listId,
  channel,
  matches,
  activeIndex,
  onActive,
  onPick,
}: MatchesListProps) {
  return (
    <div className="absolute top-full right-0 left-0 z-30 mt-1 max-h-[min(440px,60vh)] overflow-y-auto rounded-control border border-subtle bg-raised p-1.5 shadow-card">
      {matches.state === 'loading' ? <ListNote>Ищем…</ListNote> : null}
      {matches.state === 'failed' ? <ListNote isAlert>{matches.message}</ListNote> : null}
      {matches.state === 'found' && matches.variants.length === 0 ? (
        <ListNote>Ничего не нашлось — попробуйте часть названия, артикул или цену.</ListNote>
      ) : null}
      {matches.state === 'found' && matches.variants.length > 0 ? (
        <ul id={listId} role="listbox" aria-label="Найденные товары" className="grid gap-0.5">
          {matches.variants.map((variant, index) => (
            <MatchRow
              key={variant.variantId}
              id={`${listId}-${index}`}
              variant={variant}
              channel={channel}
              isActive={index === activeIndex}
              onActive={() => onActive(index)}
              onPick={() => onPick(variant)}
            />
          ))}
        </ul>
      ) : null}
      {matches.state === 'found' && matches.variants.length >= VARIANT_SEARCH_LIMIT ? (
        <ListNote>Показаны первые {VARIANT_SEARCH_LIMIT} — уточните запрос.</ListNote>
      ) : null}
    </div>
  )
}

function ListNote({
  children,
  isAlert = false,
}: {
  readonly children: React.ReactNode
  readonly isAlert?: boolean
}) {
  return (
    <p className={cn('px-2.5 py-2 text-[12.5px]', isAlert ? 'text-alert' : 'text-muted')}>
      {children}
    </p>
  )
}

type MatchRowProps = {
  readonly id: string
  readonly variant: AddableVariant
  readonly channel: SalesChannel
  readonly isActive: boolean
  readonly onActive: () => void
  readonly onPick: () => void
}

function MatchRow({ id, variant, channel, isActive, onActive, onPick }: MatchRowProps) {
  const isAvailable = isPickable(variant)

  return (
    <li
      id={id}
      role="option"
      aria-selected={isActive}
      aria-disabled={!isAvailable}
      // Keeps the focus in the field: the list stays usable from the keyboard.
      onMouseDown={(event) => event.preventDefault()}
      onMouseEnter={isAvailable ? onActive : undefined}
      onClick={onPick}
      className={cn(
        'flex min-w-0 items-center gap-3 rounded-[6px] px-2 py-1.5 text-[13px]',
        isAvailable ? 'cursor-pointer' : 'cursor-default opacity-75',
        isActive && 'bg-hover',
      )}
    >
      <span className="relative size-11 shrink-0 overflow-hidden rounded-[6px] bg-sunken">
        {variant.imageUrl ? (
          <Image src={variant.imageUrl} alt="" fill sizes="44px" className="object-cover" />
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 font-medium text-ink sm:line-clamp-1">
          {[variant.title, variant.variantLabel].filter(Boolean).join(' · ')}
        </span>
        <span className="block truncate text-[12px] text-faint">{factsOf(variant, channel)}</span>
        {/* A phone has no room beside the text: the status goes under it. */}
        <span className="block sm:hidden">
          <RowStatus variant={variant} />
        </span>
      </span>
      <span className="hidden shrink-0 sm:block">
        <RowStatus variant={variant} />
      </span>
    </li>
  )
}

function RowStatus({ variant }: { readonly variant: AddableVariant }) {
  if (variant.unitPriceCents === null) {
    return (
      <Link
        href={`/admin/catalog/${variant.productSlug}`}
        target="_blank"
        onClick={(event) => event.stopPropagation()}
        className="text-[12px] font-semibold text-alert hover:underline"
      >
        Нет цены дропшиппера →
      </Link>
    )
  }
  if (variant.stockQty < 1) {
    return <span className="text-[12px] font-semibold text-muted">Нет на складе</span>
  }
  return <span className="text-[12px] font-semibold text-accent-hover">Добавить</span>
}

// A partner order shows both prices: the partner's, and the site's the
// partner must not undercut.
const PRICE_FACTS: Readonly<Record<SalesChannel, (variant: AddableVariant) => string>> = {
  [SalesChannel.Site]: (variant) => money(variant.retailUnitPriceCents),
  [SalesChannel.Dropship]: (variant) =>
    variant.unitPriceCents === null
      ? `розница ${money(variant.retailUnitPriceCents)}`
      : `дроп ${money(variant.unitPriceCents)} · розница ${money(variant.retailUnitPriceCents)}`,
}

function factsOf(variant: AddableVariant, channel: SalesChannel): string {
  return [variant.sku, PRICE_FACTS[channel](variant), `остаток ${variant.stockQty}`].join(' · ')
}

function isPickable(variant: AddableVariant): boolean {
  return variant.unitPriceCents !== null && variant.stockQty > 0
}

const KOPIYKAS_PER_HRYVNIA = 100

// «3 550 ₴» for the usual whole price; kopiykas only when the price has them.
function money(cents: number): string {
  const amount = createMoney(cents, Currency.Uah)
  return cents % KOPIYKAS_PER_HRYVNIA === 0 ? formatWholeMoney(amount) : formatMoney(amount)
}
