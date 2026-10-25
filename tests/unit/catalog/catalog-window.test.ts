import { describe, expect, it } from 'vitest'
import {
  catalogWindow,
  loadMoreStep,
  MAX_WINDOW_PAGES,
} from '@/features/catalog/model/catalog-window'

const PAGE_SIZE = 15

describe('catalogWindow', () => {
  it('shows the first page by default', () => {
    expect(catalogWindow(null, null)).toEqual({ firstPage: 1, lastPage: 1 })
  })

  it('shows one numbered page', () => {
    expect(catalogWindow('3', null)).toEqual({ firstPage: 3, lastPage: 3 })
  })

  it('grows from the first shown page', () => {
    expect(catalogWindow(null, '3')).toEqual({ firstPage: 1, lastPage: 3 })
    expect(catalogWindow('2', '4')).toEqual({ firstPage: 2, lastPage: 4 })
  })

  it('ignores a broken or backwards pages value', () => {
    expect(catalogWindow('2', '1')).toEqual({ firstPage: 2, lastPage: 2 })
    expect(catalogWindow('abc', '-3')).toEqual({ firstPage: 1, lastPage: 1 })
    expect(catalogWindow('1.5', '2.5')).toEqual({ firstPage: 1, lastPage: 1 })
  })

  it('caps a hand-typed huge window', () => {
    expect(catalogWindow(null, '1000')).toEqual({ firstPage: 1, lastPage: MAX_WINDOW_PAGES })
  })
})

describe('loadMoreStep', () => {
  it('offers the next 15 and counts what is shown', () => {
    expect(
      loadMoreStep(
        { firstPage: 1, lastPage: 2 },
        { shownCount: 30, total: 47, pageCount: 4 },
        PAGE_SIZE,
      ),
    ).toEqual({ shownFrom: 1, shownTo: 30, next: { page: 1, pages: 3 }, nextCount: 15 })
  })

  it('offers only what is left on the last step', () => {
    expect(
      loadMoreStep(
        { firstPage: 1, lastPage: 3 },
        { shownCount: 45, total: 47, pageCount: 4 },
        PAGE_SIZE,
      ),
    ).toEqual({ shownFrom: 1, shownTo: 45, next: { page: 1, pages: 4 }, nextCount: 2 })
  })

  it('ends at the last page', () => {
    expect(
      loadMoreStep(
        { firstPage: 1, lastPage: 4 },
        { shownCount: 47, total: 47, pageCount: 4 },
        PAGE_SIZE,
      ),
    ).toEqual({ shownFrom: 1, shownTo: 47, next: null, nextCount: 0 })
  })

  it('keeps a list opened mid-way growing from where it starts', () => {
    expect(
      loadMoreStep(
        { firstPage: 2, lastPage: 2 },
        { shownCount: 15, total: 47, pageCount: 4 },
        PAGE_SIZE,
      ),
    ).toEqual({ shownFrom: 16, shownTo: 30, next: { page: 2, pages: 3 }, nextCount: 15 })
  })

  it('starts a new window instead of growing past the ceiling', () => {
    const step = loadMoreStep(
      { firstPage: 1, lastPage: MAX_WINDOW_PAGES },
      { shownCount: MAX_WINDOW_PAGES * PAGE_SIZE, total: 400, pageCount: 27 },
      PAGE_SIZE,
    )

    expect(step.next).toEqual({ page: MAX_WINDOW_PAGES + 1 })
    expect(step.nextCount).toBe(PAGE_SIZE)
  })
})
