'use server'

import { updateTag } from 'next/cache'
import { z } from 'zod'
import {
  searchFeaturedCandidates,
  type FeaturedBoardItem,
} from '@/features/admin/queries/get-storefront'
import { readAdminSession } from '@/features/admin/session-cookie'
import { FeaturedMode, FEATURED_LIMIT } from '@/config/storefront'
import { storefrontAdminService } from '@/features/admin/services/storefront-admin'
import { actionError, actionOk, toActionError, type ActionResult } from '@/lib/action-result'
import { logger } from '@/lib/logger'

const FeaturedSchema = z.object({
  slugs: z.array(z.string().trim().min(1).max(200)).max(FEATURED_LIMIT),
})

const ModeSchema = z.object({ mode: z.enum([FeaturedMode.Manual, FeaturedMode.Auto]) })

const SearchSchema = z.object({ term: z.string().trim().max(120) })

export async function saveFeaturedAction(input: unknown): Promise<ActionResult<null>> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  const parsed = FeaturedSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION_FAILED', 'Unknown product in the list.')

  try {
    await storefrontAdminService.setFeatured(parsed.data.slugs)
    updateTag('catalog')
    logger.info('Featured rail saved', { admin: session.email, count: parsed.data.slugs.length })

    return actionOk(null)
  } catch (error) {
    return toActionError(error)
  }
}

export async function setFeaturedModeAction(input: unknown): Promise<ActionResult<null>> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  const parsed = ModeSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION_FAILED', 'Unknown mode.')

  try {
    await storefrontAdminService.setMode(parsed.data.mode)
    updateTag('catalog')

    return actionOk(null)
  } catch (error) {
    return toActionError(error)
  }
}

export async function searchFeaturedAction(
  input: unknown,
): Promise<ActionResult<readonly FeaturedBoardItem[]>> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  const parsed = SearchSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION_FAILED', 'Bad search.')

  try {
    return actionOk(await searchFeaturedCandidates(parsed.data.term))
  } catch (error) {
    return toActionError(error)
  }
}
