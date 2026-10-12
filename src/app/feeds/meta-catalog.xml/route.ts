import { getMetaCatalogXml } from '@/features/catalog'

// Fetched by Meta's Commerce Manager on its schedule (Catalogue → Data
// sources → Data feed → scheduled URL) for catalogue ads and retargeting.
export async function GET(): Promise<Response> {
  return new Response(await getMetaCatalogXml(), {
    headers: { 'content-type': 'application/xml; charset=utf-8' },
  })
}
