import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import { env } from '@/lib/env'
import { isSharedSecretMatch } from '@/lib/shared-secret'

// Operational cache invalidation for data changed outside the app — the
// content port script, hand-run SQL such as the curated best-sellers order.
// Server actions keep calling revalidateTag directly; this route exists for
// external callers only (AGENTS.md §5).
const bodySchema = z.object({
  tags: z
    .array(z.string().regex(/^[a-z0-9:_-]+$/i))
    .min(1)
    .max(20),
})

export async function POST(request: Request): Promise<Response> {
  const secret = request.headers.get('x-revalidate-secret')
  if (!isSharedSecretMatch(secret, env.REVALIDATE_SECRET)) {
    return new Response('forbidden', { status: 403 })
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return new Response('bad request', { status: 400 })

  // { expire: 0 } purges immediately; updateTag is server-action-only.
  for (const tag of parsed.data.tags) revalidateTag(tag, { expire: 0 })

  return Response.json({ revalidated: parsed.data.tags })
}
