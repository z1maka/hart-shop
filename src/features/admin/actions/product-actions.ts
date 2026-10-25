'use server'

import { updateTag } from 'next/cache'
import {
  FAQ_ANSWER_MAX_LENGTH,
  FAQ_MAX_ENTRIES,
  FAQ_MIN_LENGTH,
  FAQ_QUESTION_MAX_LENGTH,
  finishedFaq,
  unfinishedFaqIndex,
  type FaqEntry,
} from '@/features/catalog/model/category-content'
import { isKnownGoogleCategory } from '@/features/catalog/model/google-category'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import {
  isValidWholesale,
  MIN_WHOLESALE_QUANTITY,
  wholesaleTierOf,
} from '@/features/catalog/model/pricing'
import { FABRIC_LAYERS } from '@/config/fabric-layers'
import { validationFailed } from '@/features/admin/model/validation-hints'
import {
  DECIMAL_INPUT_PATTERN,
  hryvniasToKopiykas,
  isValidSalePrice,
  kilosToGrams,
  MAX_CATALOG_POSITION,
  MAX_PRODUCT_WEIGHT_KG,
  parseCatalogPosition,
  parseDecimalInput,
  parseSpecs,
  parseStock,
  parseVariantCovers,
  nextSlug,
} from '@/features/admin/model/product-form'
import { productAdminService } from '@/features/admin/services/product-admin'
import { readAdminSession } from '@/features/admin/session-cookie'
import { actionError, actionOk, toActionError, type ActionResult } from '@/lib/action-result'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'
import { slugify } from '@/lib/utils'

const GRAMS_PER_KILO = 1000

const STALE_FORM_CODE = 'STALE_FORM'

function isStaleForm(formData: FormData): boolean {
  return String(formData.get('formVersion') ?? '') !== env.APP_BUILD_ID
}

const decimalInput = (max: number) =>
  z
    .string()
    .trim()
    .regex(DECIMAL_INPUT_PATTERN, 'только цифры, до трёх знаков после запятой')
    .transform((value) => Number(value.replace(',', '.')))
    .refine((value) => value >= 0 && value <= max, `от 0 до ${max}`)

// Blank means no sale: the storefront shows the regular price alone.
const optionalDecimalInput = (max: number) =>
  z
    .string()
    .trim()
    .default('')
    .transform((value) => (value === '' ? null : value))
    .pipe(z.union([z.null(), decimalInput(max)]))

// Two or three sentences; Google shows about half of that, the rest reads
// under the price on the page.
const SUMMARY_MAX_LENGTH = 300

// The select's value: absent (a form from before the field) leaves the
// stored category alone, empty means «as the category», else the Google id.
function googleCategoryChoice(value: string | undefined): number | null | undefined {
  if (value === undefined) return undefined
  if (value === '') return null
  return Number(value)
}

const BRAND_MAX_LENGTH = 80
const COLOR_GROUP_MAX_LENGTH = 60
// The FAQ editor puts this field in the form, so a form without it is one
// rendered before the editor existed and must not wipe the stored answers.
const FAQ_EDITOR_FIELD = 'faqEditor'

const FaqEntriesSchema = z
  .array(
    z.object({
      question: z.string().trim().min(FAQ_MIN_LENGTH).max(FAQ_QUESTION_MAX_LENGTH),
      answer: z.string().trim().min(FAQ_MIN_LENGTH).max(FAQ_ANSWER_MAX_LENGTH),
    }),
  )
  .max(FAQ_MAX_ENTRIES)

const SaveProductSchema = z
  .object({
    sku: z.string().trim().min(2).max(60),
    slug: z.string().trim().min(2).max(160),
    title: z.string().trim().min(2).max(200),
    // Optional: a list-sized name. Empty means the list prints the full one.
    shortTitle: z.string().trim().max(80),
    seoTitle: z.string().trim().max(70),
    seoDescription: z.string().trim().max(160),
    description: z.string().trim().min(2).max(4000),
    categoryId: z.uuid(),
    price: decimalInput(100_000),
    salePrice: optionalDecimalInput(100_000),
    wholesalePrice: optionalDecimalInput(100_000),
    wholesaleMinQty: z
      .string()
      .trim()
      .default('')
      .transform((value) => (value === '' ? null : value))
      .pipe(
        z.union([
          z.null(),
          z
            .string()
            .regex(/^\d{1,4}$/)
            .transform(Number)
            .pipe(z.number().int().min(MIN_WHOLESALE_QUANTITY).max(9999)),
        ]),
      ),
    // Absent from a form rendered before the field existed: leave it alone.
    cost: optionalDecimalInput(100_000).optional(),
    weight: decimalInput(MAX_PRODUCT_WEIGHT_KG),
    // 1 = not a fabric product; above that, one described layer each.
    layers: z.coerce.number().int().min(1).max(FABRIC_LAYERS.length),
    summary: z.string().trim().max(SUMMARY_MAX_LENGTH),
    // Absent from a form rendered before the fields existed: leave them alone.
    brand: z.string().trim().max(BRAND_MAX_LENGTH).optional(),
    colorGroup: z.string().trim().toLowerCase().max(COLOR_GROUP_MAX_LENGTH).optional(),
    // Absent from a form rendered before the field existed: leave it alone.
    googleProductCategory: z
      .string()
      .trim()
      .optional()
      .transform(googleCategoryChoice)
      .refine((value) => value === undefined || value === null || isKnownGoogleCategory(value), {
        message: 'нет в списке категорий Google',
      }),
  })
  .refine(
    (data) => isValidSalePrice(hryvniasToKopiykas(data.price), nullableKopiykas(data.salePrice)),
    { path: ['salePrice'], message: 'больше нуля и меньше обычной цены' },
  )
  // The tier is a pair: a quantity without a price, or a price without a
  // quantity, is half a setting and is refused rather than guessed.
  .refine((data) => (data.wholesaleMinQty === null) === (data.wholesalePrice === null), {
    path: ['wholesalePrice'],
    message: 'нужны и оптовая цена, и количество',
  })
  .refine(
    (data) =>
      isValidWholesale(
        hryvniasToKopiykas(data.price),
        nullableKopiykas(data.salePrice),
        wholesaleTierOf(data.wholesaleMinQty, nullableKopiykas(data.wholesalePrice)),
      ),
    { path: ['wholesalePrice'], message: 'ниже обычной цены и цены со скидкой, количество от 2' },
  )

// Undefined (the form had no such field) stays undefined; blank clears it.
function blankToNull(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined
  return value === '' ? null : value
}

// The product's questions in the editor's order: fully blank rows are not
// saved, a half-filled or overlong one refuses the save. Undefined when the
// form carries no FAQ editor at all.
function parseFaq(formData: FormData): FaqEntry[] | null | undefined {
  if (!formData.has(FAQ_EDITOR_FIELD)) return undefined

  const answers = formData.getAll('faqAnswer').map(String)
  const entries = formData
    .getAll('faqQuestion')
    .map((question, index) => ({ question: String(question), answer: answers[index] ?? '' }))
  if (unfinishedFaqIndex(entries) !== -1) return null

  const parsed = FaqEntriesSchema.safeParse(finishedFaq(entries))
  return parsed.success ? parsed.data : null
}

function nullableKopiykas(hryvnias: number | null): number | null {
  return hryvnias === null ? null : hryvniasToKopiykas(hryvnias)
}

const WeightSchema = z.object({
  slug: z.string().trim().min(1).max(160),
  // Kilograms as the admin types them: "1,4" or "0.85".
  weightKg: z
    .string()
    .trim()
    .transform(parseDecimalInput)
    .pipe(z.number().positive().max(MAX_PRODUCT_WEIGHT_KG)),
})

// Filled from the catalog list, where the admin sees at a glance which
// products still have none.
export async function setProductWeightAction(input: unknown): Promise<ActionResult<null>> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  const parsed = WeightSchema.safeParse(input)
  if (!parsed.success) return validationFailed(parsed.error)

  try {
    await productAdminService.setWeight(parsed.data.slug, kilosToGrams(parsed.data.weightKg))
    updateTag('catalog')
    logger.info('Product weight set', { admin: session.email, slug: parsed.data.slug })
    return actionOk(null)
  } catch (error) {
    return toActionError(error)
  }
}

const CatalogPositionSchema = z.object({
  slug: z.string().trim().min(1).max(160),
  // Blank clears the place; otherwise a whole number, 1 being the first card.
  position: z
    .string()
    .trim()
    .transform(parseCatalogPosition)
    .pipe(z.number().int().min(1).max(MAX_CATALOG_POSITION).nullable()),
})

// The order of «Рекомендовані» in the shop, set row by row in the catalog list.
export async function setProductCatalogPositionAction(
  input: unknown,
): Promise<ActionResult<null>> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  const parsed = CatalogPositionSchema.safeParse(input)
  if (!parsed.success) return validationFailed(parsed.error)

  try {
    await productAdminService.setCatalogPosition(parsed.data.slug, parsed.data.position)
    updateTag('catalog')
    logger.info('Product catalog position set', {
      admin: session.email,
      slug: parsed.data.slug,
      position: parsed.data.position,
    })
    return actionOk(null)
  } catch (error) {
    return toActionError(error)
  }
}

export type SaveProductResult = ActionResult<{ slug: string }> & {
  // On failure the typed values ride back so the form can re-fill itself:
  // React 19 resets uncontrolled fields once the action settles.
  readonly values?: Readonly<Record<string, string>>
}

function formValues(formData: FormData): Record<string, string> {
  return Object.fromEntries(
    [...formData.entries()].filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  )
}

function withValues(result: SaveProductResult, formData: FormData): SaveProductResult {
  return result.ok ? result : { ...result, values: formValues(formData) }
}

export async function saveProductAction(
  _previous: SaveProductResult | null,
  formData: FormData,
): Promise<SaveProductResult> {
  return withValues(await saveProduct(formData), formData)
}

async function saveProduct(formData: FormData): Promise<SaveProductResult> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  const currentSlug = String(formData.get('currentSlug') ?? '')
  const parsed = SaveProductSchema.safeParse(Object.fromEntries(formData))
  // A tab opened before a deploy may lack fields the schema now expects:
  // when such a form fails, the reason is the deploy, not the admin. A form
  // the schema still accepts is saved whatever build rendered it.
  if (!parsed.success) {
    return isStaleForm(formData) ? actionError(STALE_FORM_CODE) : validationFailed(parsed.error)
  }

  const variantIds = formData.getAll('variantId').map(String)
  const stock = parseStock(variantIds, formData.getAll('variantStock').map(String))
  if (!stock) return actionError('VALIDATION_FAILED', 'variantStock', 'целое число от 0')

  const covers = parseVariantCovers(variantIds, formData.getAll('variantCover').map(String))
  if (!covers) {
    return actionError('VALIDATION_FAILED', 'variantCover', 'обновите страницу и выберите фото заново')
  }

  const faq = parseFaq(formData)
  if (faq === null) {
    return actionError('VALIDATION_FAILED', 'faq', `у каждого вопроса нужен ответ, не больше ${FAQ_MAX_ENTRIES} пар`)
  }

  let savedSlug = currentSlug
  try {
    savedSlug = await productAdminService.save(currentSlug, {
      sku: parsed.data.sku,
      slug: nextSlug(currentSlug, parsed.data.slug),
      title: parsed.data.title,
      shortTitle: parsed.data.shortTitle === '' ? null : parsed.data.shortTitle,
      seoTitle: parsed.data.seoTitle === '' ? null : parsed.data.seoTitle,
      seoDescription: parsed.data.seoDescription === '' ? null : parsed.data.seoDescription,
      description: parsed.data.description,
      categoryId: parsed.data.categoryId,
      googleProductCategory: parsed.data.googleProductCategory,
      priceCents: hryvniasToKopiykas(parsed.data.price),
      salePriceCents: nullableKopiykas(parsed.data.salePrice),
      wholesaleMinQty: parsed.data.wholesaleMinQty,
      wholesalePriceCents: nullableKopiykas(parsed.data.wholesalePrice),
      costCents: parsed.data.cost === undefined ? undefined : nullableKopiykas(parsed.data.cost),
      weightGrams: Math.round(parsed.data.weight * GRAMS_PER_KILO),
      layers: parsed.data.layers,
      summary: parsed.data.summary,
      brand: blankToNull(parsed.data.brand),
      colorGroup: blankToNull(parsed.data.colorGroup),
      faq,
      specs: parseSpecs(
        formData.getAll('specLabel').map(String),
        formData.getAll('specValue').map(String),
      ),
      stockByVariantId: stock,
      coverByVariantId: covers,
    })

    updateTag('catalog')
    logger.info('Product saved', { admin: session.email, slug: savedSlug })
  } catch (error) {
    return toActionError(error)
  }

  if (savedSlug !== currentSlug) redirect(`/admin/catalog/${savedSlug}`)

  return actionOk({ slug: savedSlug })
}

const NewProductSchema = z.object({
  sku: z.string().trim().min(2).max(60),
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().min(2).max(4000),
  categoryId: z.uuid(),
  price: decimalInput(100_000),
  weight: decimalInput(MAX_PRODUCT_WEIGHT_KG),
  variantColor: z.string().trim().min(2).max(60),
})

export async function createProductAction(
  _previous: SaveProductResult | null,
  formData: FormData,
): Promise<SaveProductResult> {
  return withValues(await createProduct(formData), formData)
}

async function createProduct(formData: FormData): Promise<SaveProductResult> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  const parsed = NewProductSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationFailed(parsed.error)

  let slug = ''
  try {
    slug = await productAdminService.create({
      slug: slugify(parsed.data.title),
      sku: parsed.data.sku,
      title: parsed.data.title,
      description: parsed.data.description,
      categoryId: parsed.data.categoryId,
      priceCents: hryvniasToKopiykas(parsed.data.price),
      weightGrams: Math.round(parsed.data.weight * GRAMS_PER_KILO),
      variantColor: parsed.data.variantColor,
    })

    updateTag('catalog')
    logger.info('Product created', { admin: session.email, slug })
  } catch (error) {
    return toActionError(error)
  }

  redirect(`/admin/catalog/${slug}`)
}
