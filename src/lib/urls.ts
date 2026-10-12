import { env } from '@/lib/env'

// Admin links the shop sends to itself — Telegram cards, internal notices.
// They follow ADMIN_BASE_URL while the shop's own domain still serves the
// old site, and the shop address once it does not.
export function adminUrl(path: string): string {
  return new URL(path, env.ADMIN_BASE_URL ?? env.NEXT_PUBLIC_SITE_URL).toString()
}
