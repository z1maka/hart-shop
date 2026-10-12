'use server'

import { updateTag } from 'next/cache'
import { z } from 'zod'
import { productImageService } from '@/features/admin/services/product-images'
import { readAdminSession } from '@/features/admin/session-cookie'
import { actionError, actionOk, toActionError, type ActionResult } from '@/lib/action-result'
import { logger } from '@/lib/logger'

const ImageTargetSchema = z.object({
  slug: z.string().trim().min(1).max(160),
  storageKey: z.string().trim().min(1).max(300),
})

export type ImageActionResult = ActionResult<null>

export async function uploadProductImageAction(
  _previous: ImageActionResult | null,
  formData: FormData,
): Promise<ImageActionResult> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  const slug = String(formData.get('slug') ?? '')
  const file = formData.get('file')

  if (!slug) return actionError('VALIDATION_FAILED', 'Unknown product.')
  if (!(file instanceof File) || file.size === 0) {
    return actionError('VALIDATION_FAILED', 'Choose a file first.')
  }

  try {
    await productImageService.add(slug, file)
    updateTag('catalog')
    logger.info('Product image added', { admin: session.email, slug, bytes: file.size })

    return actionOk(null)
  } catch (error) {
    return toActionError(error)
  }
}

export async function deleteProductImageAction(input: unknown): Promise<ImageActionResult> {
  return withImage(input, 'Product image deleted', (slug, storageKey) =>
    productImageService.remove(slug, storageKey),
  )
}

export async function moveImageLeftAction(input: unknown): Promise<ImageActionResult> {
  return withImage(input, 'Product image moved left', (slug, storageKey) =>
    productImageService.move(slug, storageKey, -1),
  )
}

export async function moveImageRightAction(input: unknown): Promise<ImageActionResult> {
  return withImage(input, 'Product image moved right', (slug, storageKey) =>
    productImageService.move(slug, storageKey, 1),
  )
}

export async function makeMainImageAction(input: unknown): Promise<ImageActionResult> {
  return withImage(input, 'Product main image changed', (slug, storageKey) =>
    productImageService.makeMain(slug, storageKey),
  )
}

async function withImage(
  input: unknown,
  logMessage: string,
  run: (slug: string, storageKey: string) => Promise<void>,
): Promise<ImageActionResult> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  const parsed = ImageTargetSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION_FAILED', 'Unknown image.')

  try {
    await run(parsed.data.slug, parsed.data.storageKey)
    updateTag('catalog')
    logger.info(logMessage, { admin: session.email, slug: parsed.data.slug })

    return actionOk(null)
  } catch (error) {
    return toActionError(error)
  }
}
