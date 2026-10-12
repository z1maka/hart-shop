'use client'

import { useCallback, useMemo, useSyncExternalStore } from 'react'
import { MAX_COMPARED_PRODUCTS } from '@/config/catalog'

type CompareState = {
  readonly slugs: readonly string[]
  readonly isFull: boolean
  readonly toggle: (slug: string) => void
  readonly remove: (slug: string) => void
  readonly clear: () => void
}

const STORAGE_KEY = 'hart_compare'
const EMPTY: readonly string[] = []

// A module-level store rather than state in an effect: the selection has to
// survive route changes and a reload without re-rendering the tree twice.
let snapshot: readonly string[] = EMPTY
let isLoaded = false
const listeners = new Set<() => void>()

function load(): void {
  if (isLoaded) return
  isLoaded = true

  const stored = window.sessionStorage.getItem(STORAGE_KEY)
  if (!stored) return

  const parsed: unknown = JSON.parse(stored)
  if (Array.isArray(parsed)) {
    snapshot = parsed.filter((entry): entry is string => typeof entry === 'string')
  }
}

function subscribe(listener: () => void): () => void {
  load()
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function publish(next: readonly string[]): void {
  snapshot = next
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  listeners.forEach((listener) => listener())
}

export function useCompare(): CompareState {
  const slugs = useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => EMPTY,
  )

  const toggle = useCallback((slug: string) => {
    if (snapshot.includes(slug)) {
      publish(snapshot.filter((entry) => entry !== slug))
      return
    }

    if (snapshot.length >= MAX_COMPARED_PRODUCTS) return
    publish([...snapshot, slug])
  }, [])

  const remove = useCallback((slug: string) => {
    publish(snapshot.filter((entry) => entry !== slug))
  }, [])

  const clear = useCallback(() => publish(EMPTY), [])

  return useMemo(
    () => ({ slugs, isFull: slugs.length >= MAX_COMPARED_PRODUCTS, toggle, remove, clear }),
    [slugs, toggle, remove, clear],
  )
}
