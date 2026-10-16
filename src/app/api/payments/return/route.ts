import { clearCartId } from '@/features/cart/session'
import {
  parseRecheckAttempt,
  paymentReturnService,
  readReturnToken,
  RETURN_PAGE_PATH,
} from '@/features/checkout'

// monobank brings the buyer back with a GET. The order is read from our own
// query string, by an access token nobody can guess.
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const token = readReturnToken(url.searchParams.get('order'))
  if (!token) return redirectTo(RETURN_PAGE_PATH, url)

  const destination = await paymentReturnService.complete(
    token,
    parseRecheckAttempt(url.searchParams.get('attempt')),
  )
  // Only a confirmed payment ends the cart: a buyer who backed out of the
  // bank's page comes back to the same basket.
  if (destination.isPaid) await clearCartId()

  return redirectTo(destination.path, url)
}

// Kept on the host the buyer came back to: the cart cookie lives there, and a
// configured site URL can name a domain that does not serve this app yet.
function redirectTo(path: string, origin: URL): Response {
  return Response.redirect(new URL(path, origin), 303)
}
