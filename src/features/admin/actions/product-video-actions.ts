'use server'

import { updateTag } from 'next/cache'
import { z } from 'zod'
import { productVideoService } from '@/features/admin/services/product-videos'
import { readAdminSession } from '@/features/admin/session-cookie'
import { actionError, actionOk, toActionError, type ActionResult } from '@/lib/action-result'
import { logger } from '@/lib/logger'

const VideoTargetSchema = z.object({
  slug: z.string().trim().min(1).max(160),
  videoId: z.string().trim().min(1).max(300),
})

export type VideoActionResult = ActionResult<null>

export async function removeProductVideoAction(input: unknown): Promise<VideoActionResult> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  const parsed = VideoTargetSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION_FAILED', 'Unknown video.')

  try {
    await productVideoService.remove(parsed.data.slug, parsed.data.videoId)
    updateTag('catalog')
    logger.info('Product video removed', {
      admin: session.email,
      slug: parsed.data.slug,
      videoId: parsed.data.videoId,
    })

    return actionOk(null)
  } catch (error) {
    return toActionError(error)
  }
}
