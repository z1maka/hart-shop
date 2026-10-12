'use server'

import { searchProducts, type SearchResultView } from '@/features/catalog/queries/search-products'
import { actionError, actionOk, toActionError, type ActionResult } from '@/lib/action-result'

const MAX_QUERY_LENGTH = 80

export async function searchProductsAction(
  term: unknown,
): Promise<ActionResult<readonly SearchResultView[]>> {
  if (typeof term !== 'string' || term.length > MAX_QUERY_LENGTH) {
    return actionError('VALIDATION_FAILED', 'Search term is too long.')
  }

  try {
    return actionOk(await searchProducts(term))
  } catch (error) {
    return toActionError(error)
  }
}
