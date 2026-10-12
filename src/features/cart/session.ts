import { cookies } from 'next/headers'

const CART_COOKIE = 'hart_cart'
const CART_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

export async function readCartId(): Promise<string | null> {
  const store = await cookies()
  return store.get(CART_COOKIE)?.value ?? null
}

export async function writeCartId(cartId: string): Promise<void> {
  const store = await cookies()

  store.set(CART_COOKIE, cartId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: CART_COOKIE_MAX_AGE_SECONDS,
  })
}

export async function clearCartId(): Promise<void> {
  const store = await cookies()
  store.delete(CART_COOKIE)
}
