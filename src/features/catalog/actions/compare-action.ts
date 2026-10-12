'use server'

import { z } from 'zod'
import { MAX_COMPARED_PRODUCTS } from '@/config/catalog'
import { getComparison, type ComparisonView } from '@/features/catalog/queries/get-comparison'
import { actionError, actionOk, toActionError, type ActionResult } from '@/lib/action-result'

const CompareSchema = z.array(z.string().trim().min(1).max(120)).max(MAX_COMPARED_PRODUCTS)

export async function getComparisonAction(slugs: unknown): Promise<ActionResult<ComparisonView>> {
  const parsed = CompareSchema.safeParse(slugs)
  if (!parsed.success) return actionError('VALIDATION_FAILED', 'Too many products to compare.')

  try {
    return actionOk(await getComparison(parsed.data))
  } catch (error) {
    return toActionError(error)
  }
}
