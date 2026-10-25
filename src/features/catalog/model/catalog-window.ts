// Which pages of the catalogue a request shows. Wide screens show one page
// of the numbered pagination (?page=N); phones grow the list with «show more»
// (?pages=M adds pages up to M after the first shown one), so a reload or
// Back from a product keeps every card that was loaded.

// A grown window never pulls more than this many pages in one request.
export const MAX_WINDOW_PAGES = 20

export type CatalogWindow = {
  readonly firstPage: number
  readonly lastPage: number
}

export type ListPosition = {
  readonly page?: number
  readonly pages?: number
}

export type LoadMoreStep = {
  // 1-based positions of the first and the last card shown.
  readonly shownFrom: number
  readonly shownTo: number
  // Where «show more» leads, or null once the list reached its end.
  readonly next: ListPosition | null
  readonly nextCount: number
}

export function catalogWindow(page: string | null, pages: string | null): CatalogWindow {
  const firstPage = positiveInteger(page) ?? 1
  const lastPage = positiveInteger(pages)
  if (lastPage === null || lastPage <= firstPage) return { firstPage, lastPage: firstPage }

  return { firstPage, lastPage: Math.min(lastPage, firstPage + MAX_WINDOW_PAGES - 1) }
}

export function loadMoreStep(
  listWindow: CatalogWindow,
  list: { readonly shownCount: number; readonly total: number; readonly pageCount: number },
  pageSize: number,
): LoadMoreStep {
  const skipped = (listWindow.firstPage - 1) * pageSize
  const shownTo = skipped + list.shownCount

  return {
    shownFrom: skipped + 1,
    shownTo,
    next: nextPosition(listWindow, list.pageCount),
    nextCount: Math.max(0, Math.min(pageSize, list.total - shownTo)),
  }
}

// A full window starts a new one at the next page instead of growing past
// the ceiling, so the list still reaches its end.
function nextPosition(listWindow: CatalogWindow, pageCount: number): ListPosition | null {
  if (listWindow.lastPage >= pageCount) return null

  const span = listWindow.lastPage - listWindow.firstPage + 1
  if (span >= MAX_WINDOW_PAGES) return { page: listWindow.lastPage + 1 }
  return { page: listWindow.firstPage, pages: listWindow.lastPage + 1 }
}

function positiveInteger(value: string | null): number | null {
  const parsed = Number(value)
  return value !== null && Number.isInteger(parsed) && parsed > 0 ? parsed : null
}
