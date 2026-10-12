import type { z } from 'zod'
import { actionError, type ActionResult } from '@/lib/action-result'

// What the validator objected to, in the admin's words: Zod's own messages
// are English and technical, and the panel prints this under the field.
export function issueHint(issue: z.ZodIssue): string {
  switch (issue.code) {
    case 'too_big':
      if (issue.origin === 'string') return `не больше ${issue.maximum} знаков`
      return issue.inclusive === false ? `меньше ${issue.maximum}` : `не больше ${issue.maximum}`
    case 'too_small':
      if (issue.origin !== 'string') {
        return issue.inclusive === false ? `больше ${issue.minimum}` : `не меньше ${issue.minimum}`
      }
      return issue.minimum <= 1 ? 'обязательное поле' : `не короче ${issue.minimum} знаков`
    // Every form field is text, so a type error means the field never
    // arrived: a tab opened before a deploy that added it.
    case 'invalid_type':
      return 'поле не передано — обновите страницу'
    case 'invalid_format':
      return issue.format === 'uuid' ? 'выберите из списка' : 'неверный формат'
    default:
      return issue.message
  }
}

// A union (an optional number typed as text) reports itself as one issue with
// the branches' issues inside; the branch that read the text says why.
export function leafIssue(issue: z.ZodIssue | undefined): z.ZodIssue | undefined {
  if (!issue || issue.code !== 'invalid_union') return issue

  const nested = issue.errors.flat().find((candidate) => candidate.code !== 'invalid_type')
  return nested ? leafIssue(nested) : issue
}

// The refused field and the reason. The field comes from the issue the
// schema reports — a union names the field, its branches carry no path —
// and the reason from the branch that looked at the text.
export function validationFailed(error: z.ZodError): ActionResult<never> {
  const top = error.issues.at(0)
  const leaf = leafIssue(top)
  const field = String(top?.path.at(0) ?? 'form')
  return actionError('VALIDATION_FAILED', field, leaf ? issueHint(leaf) : undefined)
}
