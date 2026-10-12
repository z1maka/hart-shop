'use server'

import { updateTag } from 'next/cache'
import { z } from 'zod'
import { AdminRole, ProductStatus } from '@/db/enums'
import { categoryManagementService } from '@/features/catalog'
import { productAdminService } from '@/features/admin/services/product-admin'
import { readAdminSession } from '@/features/admin/session-cookie'
import { actionError, actionOk, toActionError, type ActionResult } from '@/lib/action-result'
import { logger } from '@/lib/logger'

const CategoryVisibilitySchema = z.object({
  slug: z.string().trim().min(1).max(120),
  isVisible: z.boolean(),
})

// One page of the list at most; the bar acts on what the admin can see.
const BULK_MAX_PRODUCTS = 100
const SLUG_MAX_LENGTH = 160

const BulkProductStatusSchema = z.object({
  slugs: z.array(z.string().trim().min(1).max(SLUG_MAX_LENGTH)).min(1).max(BULK_MAX_PRODUCTS),
  status: z.enum([ProductStatus.Published, ProductStatus.Archived]),
})

const CATEGORIES_MAX = 100

const CategoryOrderSchema = z.object({
  slugs: z.array(z.string().trim().min(1).max(SLUG_MAX_LENGTH)).min(1).max(CATEGORIES_MAX),
})

const ProductStatusSchema = z.object({
  slug: z.string().trim().min(1).max(160),
  status: z.enum([ProductStatus.Published, ProductStatus.Archived, ProductStatus.Draft]),
})

export async function setCategoryVisibilityAction(input: unknown): Promise<ActionResult<number>> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  // Hiding a category archives everything inside it, so it stays with the owner.
  if (session.role !== AdminRole.Owner) {
    return actionError('FORBIDDEN', 'Only an owner can hide a category.')
  }

  const parsed = CategoryVisibilitySchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION_FAILED', 'Unknown category.')

  try {
    const change = await categoryManagementService.setVisibility(
      parsed.data.slug,
      parsed.data.isVisible,
    )

    // Catalog pages, facets and the header menu all read this tag. updateTag
    // rather than revalidateTag: the admin must see the change on this request,
    // not on the one after it.
    updateTag('catalog')

    logger.info('Category visibility changed', {
      admin: session.email,
      slug: change.slug,
      isVisible: change.isVisible,
      products: change.productsAffected,
    })

    return actionOk(change.productsAffected)
  } catch (error) {
    return toActionError(error)
  }
}

export async function setProductStatusAction(input: unknown): Promise<ActionResult<null>> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  const parsed = ProductStatusSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION_FAILED', 'Unknown product or status.')

  try {
    await productAdminService.setStatus(parsed.data.slug, parsed.data.status)
    updateTag('catalog')

    logger.info('Product status changed', {
      admin: session.email,
      slug: parsed.data.slug,
      status: parsed.data.status,
    })

    return actionOk(null)
  } catch (error) {
    return toActionError(error)
  }
}

export async function setProductsStatusAction(input: unknown): Promise<ActionResult<number>> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  const parsed = BulkProductStatusSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION_FAILED', 'Unknown products or status.')

  try {
    const changed = await productAdminService.setStatusMany(parsed.data.slugs, parsed.data.status)
    updateTag('catalog')
    logger.info('Product status changed in bulk', {
      admin: session.email,
      status: parsed.data.status,
      requested: parsed.data.slugs.length,
      changed,
    })
    return actionOk(changed)
  } catch (error) {
    return toActionError(error)
  }
}

export async function reorderCategoriesAction(input: unknown): Promise<ActionResult<null>> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  if (session.role !== AdminRole.Owner) {
    return actionError('FORBIDDEN', 'Only an owner can reorder the header.')
  }

  const parsed = CategoryOrderSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION_FAILED', 'Unknown categories.')

  try {
    await categoryManagementService.reorder(parsed.data.slugs)
    updateTag('catalog')
    logger.info('Categories reordered', { admin: session.email, slugs: parsed.data.slugs })
    return actionOk(null)
  } catch (error) {
    return toActionError(error)
  }
}

// Scripts write to the database directly and cannot reach Next's cache, so a
// bulk import or repricing run leaves the shop showing yesterday's numbers
// until this is pressed or the hour-long cache life expires.
export async function refreshStorefrontAction(): Promise<ActionResult<null>> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  updateTag('catalog')
  logger.info('Storefront cache refreshed', { admin: session.email })

  return actionOk(null)
}
