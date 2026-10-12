import { getMerchantFeedXml } from '@/features/catalog'

// Fetched by Google Merchant Center on its schedule (Products → Data sources →
// a file from a link), in place of the WooCommerce plugin's Content API push.
export async function GET(): Promise<Response> {
  return new Response(await getMerchantFeedXml(), {
    headers: { 'content-type': 'application/xml; charset=utf-8' },
  })
}
