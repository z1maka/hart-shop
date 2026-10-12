import { AppError } from '@/lib/errors'
import { logger } from '@/lib/logger'

export type ActionError = {
  readonly code: string
  readonly message: string
  // For a validation error: what is wrong with the field named in `message`,
  // in the admin's words («не больше 70 знаков»), printed under that field.
  readonly hint?: string
}

export type ActionResult<T> =
  { readonly ok: true; readonly data: T } | { readonly ok: false; readonly error: ActionError }

const UNEXPECTED_ERROR_CODE = 'UNEXPECTED_ERROR'

export function actionOk<T>(data: T): ActionResult<T> {
  return { ok: true, data }
}

export function actionError(
  code: string,
  message: string = code,
  hint?: string,
): ActionResult<never> {
  return { ok: false, error: hint === undefined ? { code, message } : { code, message, hint } }
}

export function toActionError(error: unknown): ActionResult<never> {
  if (error instanceof AppError) {
    return actionError(error.code, error.message)
  }

  logger.error('Unhandled error in server action', { error })
  return actionError(UNEXPECTED_ERROR_CODE, 'Something went wrong. Please try again.')
}
