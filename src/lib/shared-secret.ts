import { timingSafeEqual } from 'node:crypto'

// For routes called by our own tooling or a scheduler: an unset secret on our
// side refuses everything rather than accepting everything.
export function isSharedSecretMatch(
  candidate: string | null,
  expected: string | undefined,
): boolean {
  if (!expected || candidate === null) return false
  const a = Buffer.from(candidate)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}
