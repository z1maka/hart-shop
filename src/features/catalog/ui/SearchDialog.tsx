'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState, useTransition } from 'react'
import { searchProductsAction } from '@/features/catalog/actions/search-action'
import type { SearchResultView } from '@/features/catalog/queries/search-products'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

type SearchDialogProps = {
  readonly suggestions: readonly string[]
  readonly initialResults: readonly SearchResultView[]
}

const DEBOUNCE_MS = 200

export function SearchDialog({ suggestions, initialResults }: SearchDialogProps) {
  const t = useTranslations('search')
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<readonly SearchResultView[]>(initialResults)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!isOpen) return

    const timer = setTimeout(() => {
      startTransition(async () => {
        const result = await searchProductsAction(query)
        if (result.ok) setResults(result.data)
      })
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [query, isOpen])

  const hasQuery = query.trim().length > 0
  const isEmpty = hasQuery && !isPending && results.length === 0

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
      <DialogPrimitive.Trigger
        aria-label={t('button')}
        className="inline-flex min-h-[42px] items-center gap-2 rounded-control border border-dark-edge px-3.5 text-[13px] font-semibold text-on-dark-muted transition-colors hover:border-khaki hover:text-khaki"
      >
        <SearchIcon />
        <span className="hidden sm:inline">{t('button')}</span>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/45" />
        <DialogPrimitive.Content className="fixed top-[8vh] left-1/2 z-50 w-[min(620px,92vw)] -translate-x-1/2 overflow-hidden rounded-card bg-surface shadow-[0_24px_60px_rgb(35_36_29_/_0.28)]">
          <DialogPrimitive.Title className="sr-only">{t('dialogTitle')}</DialogPrimitive.Title>

          <div className="flex items-center gap-2.5 border-b border-subtle px-4 py-3.5">
            <span className="text-faint">
              <SearchIcon />
            </span>
            <input
              type="search"
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('placeholder')}
              className="flex-1 bg-transparent py-2.5 text-[15.5px] text-ink outline-none placeholder:text-faint"
            />
            <DialogPrimitive.Close className="min-h-10 rounded-control border border-subtle px-3 text-[12.5px] font-semibold text-muted hover:border-faint hover:text-ink">
              Esc
            </DialogPrimitive.Close>
          </div>

          <div className="flex flex-wrap items-center gap-2 px-4 pt-3.5 pb-2">
            <span className="text-[12px] font-semibold text-faint">
              {hasQuery ? t('results') : t('popular')}
            </span>
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setQuery(suggestion)}
                className="min-h-8.5 rounded-chip border border-strong bg-raised px-3 text-[12px] font-medium text-muted hover:border-accent hover:text-ink"
              >
                {suggestion}
              </button>
            ))}
          </div>

          <div className="max-h-[52vh] overflow-auto px-2 pt-1.5 pb-3">
            {results.map((result) => (
              <DialogPrimitive.Close key={result.slug} asChild>
                <Link
                  href={`/product/${result.slug}/`}
                  className={cn(
                    'flex w-full items-center gap-3.5 rounded-control p-2.5 text-left hover:bg-hover',
                  )}
                >
                  <span className="relative size-14 shrink-0 overflow-hidden rounded-chip border border-subtle bg-sunken">
                    {result.imageUrl ? (
                      <Image
                        src={result.imageUrl}
                        alt=""
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    ) : null}
                  </span>
                  <span className="flex-1">
                    <span className="block text-[14px] leading-snug font-semibold text-ink">
                      {result.title}
                    </span>
                    <span className="mt-0.5 block text-[12px] text-faint">{result.meta}</span>
                  </span>
                  <span className="font-display text-[15px] font-bold text-ink">
                    {result.priceLabel}
                  </span>
                </Link>
              </DialogPrimitive.Close>
            ))}

            {isEmpty ? (
              <p className="px-2.5 py-6 text-[14px] leading-relaxed text-muted">{t('empty')}</p>
            ) : null}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
