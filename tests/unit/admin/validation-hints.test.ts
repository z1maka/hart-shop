import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { issueHint, leafIssue, validationFailed } from '@/features/admin/model/validation-hints'

function failure(result: z.ZodSafeParseResult<unknown>): z.ZodError {
  if (result.success) throw new Error('expected a failed parse')
  return result.error
}

function firstIssue(result: z.ZodSafeParseResult<unknown>): z.ZodIssue {
  const issue = failure(result).issues.at(0)
  if (!issue) throw new Error('expected an issue')
  return issue
}

describe('issueHint', () => {
  it('says how long a text may be', () => {
    expect(issueHint(firstIssue(z.string().max(70).safeParse('x'.repeat(71))))).toBe(
      'не больше 70 знаков',
    )
    expect(issueHint(firstIssue(z.string().min(2).safeParse('a')))).toBe('не короче 2 знаков')
    expect(issueHint(firstIssue(z.string().min(1).safeParse('')))).toBe('обязательное поле')
  })

  it('names a missing field and a bad choice', () => {
    expect(issueHint(firstIssue(z.object({ seoTitle: z.string() }).safeParse({})))).toBe(
      'поле не передано — обновите страницу',
    )
    expect(issueHint(firstIssue(z.uuid().safeParse('')))).toBe('выберите из списка')
  })

  it('words an open bound as strictly greater', () => {
    expect(issueHint(firstIssue(z.number().positive().safeParse(0)))).toBe('больше 0')
  })

  it('passes a refine message through', () => {
    const issue = firstIssue(z.number().refine((value) => value > 0, 'больше нуля').safeParse(0))
    expect(issueHint(issue)).toBe('больше нуля')
  })
})

describe('leafIssue', () => {
  it('reads the branch that looked at the text inside a union', () => {
    const schema = z.union([z.null(), z.string().regex(/^\d{1,4}$/)])
    const issue = leafIssue(firstIssue(schema.safeParse('abc')))

    expect(issue?.code).toBe('invalid_format')
    expect(issue && issueHint(issue)).toBe('неверный формат')
  })
})

describe('validationFailed', () => {
  const schema = z.object({
    wholesaleMinQty: z.union([z.null(), z.string().regex(/^\d{1,4}$/)]),
    weight: z.number().positive(),
  })

  it('names the field from the schema even when a union branch refused', () => {
    const result = validationFailed(failure(schema.safeParse({ wholesaleMinQty: 'abc', weight: 1 })))

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.message).toBe('wholesaleMinQty')
    expect(result.error.hint).toBe('неверный формат')
  })

  it('carries the reason for a plain field', () => {
    const result = validationFailed(failure(schema.safeParse({ wholesaleMinQty: null, weight: 0 })))

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.message).toBe('weight')
    expect(result.error.hint).toBe('больше 0')
  })
})
