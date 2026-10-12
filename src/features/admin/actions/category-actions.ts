'use server'

import { updateTag } from 'next/cache'
import {
  CATEGORY_STORY_MAX_LENGTH,
  FAQ_ANSWER_MAX_LENGTH,
  FAQ_MAX_ENTRIES,
  FAQ_MIN_LENGTH,
  FAQ_QUESTION_MAX_LENGTH,
} from '@/features/catalog/model/category-content'
import { isKnownGoogleCategory } from '@/features/catalog/model/google-category'
import { z } from 'zod'
import { AdminRole } from '@/db/enums'
import { categoryManagementService } from '@/features/catalog'
import { validationFailed } from '@/features/admin/model/validation-hints'
import { readAdminSession } from '@/features/admin/session-cookie'
import { actionError, actionOk, toActionError, type ActionResult } from '@/lib/action-result'
import { logger } from '@/lib/logger'
import { slugify } from '@/lib/utils'

const NewCategorySchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().max(120),
  description: z.string().trim().max(400),
  position: z.coerce.number().int().min(0).max(999),
})

export type NewCategoryResult = ActionResult<{ slug: string }> & {
  // Failed submissions carry the typed values back so the panel can re-fill
  // itself: React 19 resets uncontrolled fields once the action settles.
  readonly values?: Readonly<Record<string, string>>
}

export async function createCategoryAction(
  _previous: NewCategoryResult | null,
  formData: FormData,
): Promise<NewCategoryResult> {
  const result = await createCategory(formData)
  if (result.ok) return result

  return {
    ...result,
    values: Object.fromEntries(
      [...formData.entries()].filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    ),
  }
}

async function createCategory(formData: FormData): Promise<NewCategoryResult> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  if (session.role !== AdminRole.Owner) {
    return actionError('FORBIDDEN', 'Only an owner can add a category.')
  }

  const parsed = NewCategorySchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationFailed(parsed.error)

  try {
    const category = await categoryManagementService.create({
      name: parsed.data.name,
      slug: parsed.data.slug ? slugify(parsed.data.slug) : slugify(parsed.data.name),
      description: parsed.data.description,
      position: parsed.data.position,
    })

    updateTag('catalog')
    logger.info('Category created', { admin: session.email, slug: category.slug })

    return actionOk({ slug: category.slug })
  } catch (error) {
    return toActionError(error)
  }
}

const SEO_TITLE_MAX_LENGTH = 70
const SEO_DESCRIPTION_MAX_LENGTH = 160

const optionalLine = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value ? value : null))

const CategoryDetailsSchema = z.object({
  categoryId: z.uuid(),
  name: z.string().trim().min(2).max(200),
  description: optionalLine(1000),
  seoTitle: optionalLine(SEO_TITLE_MAX_LENGTH),
  seoDescription: optionalLine(SEO_DESCRIPTION_MAX_LENGTH),
  seoText: optionalLine(CATEGORY_STORY_MAX_LENGTH),
  faq: z
    .array(
      z.object({
        question: z.string().trim().min(FAQ_MIN_LENGTH).max(FAQ_QUESTION_MAX_LENGTH),
        answer: z.string().trim().min(FAQ_MIN_LENGTH).max(FAQ_ANSWER_MAX_LENGTH),
      }),
    )
    .max(FAQ_MAX_ENTRIES)
    .default([]),
  googleProductCategory: z
    .number()
    .int()
    .refine(isKnownGoogleCategory, 'нет в списке категорий Google')
    .nullable()
    .default(null),
})

export async function updateCategoryDetailsAction(input: unknown): Promise<ActionResult<null>> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  if (session.role !== AdminRole.Owner) {
    return actionError('FORBIDDEN', 'Only an owner can rename a category.')
  }

  const parsed = CategoryDetailsSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION_FAILED', 'name')

  try {
    await categoryManagementService.updateDetails(parsed.data.categoryId, {
      name: parsed.data.name,
      description: parsed.data.description,
      seoTitle: parsed.data.seoTitle,
      seoDescription: parsed.data.seoDescription,
      seoText: parsed.data.seoText,
      faq: parsed.data.faq,
      googleProductCategory: parsed.data.googleProductCategory,
    })

    updateTag('catalog')

    return actionOk(null)
  } catch (error) {
    return toActionError(error)
  }
}
