import { getPartnerFeedYml } from '@/features/catalog'

// Fetched by dropshipping partners' shops to import our goods (Prom, Rozetka,
// Horoshop, OpenCart read YML). It repeats our pages' texts, so search engines
// are asked to leave it out.
export async function GET(): Promise<Response> {
  return new Response(await getPartnerFeedYml(), {
    headers: { 'content-type': 'application/xml; charset=utf-8', 'x-robots-tag': 'noindex' },
  })
}
