import { randomBytes } from 'node:crypto'

const KEY_TOKEN_BYTES = 4
const KEY_NAME_PATTERN = /^(\d+)(?:-[0-9a-f]+)?\.webp$/

export type ProductImageKeys = {
  readonly storageKey: string
  readonly squareStorageKey: string
}

// Every upload gets a name no object ever had. Objects are served with a
// year-long immutable Cache-Control, so a reused name (0.webp again after every
// photo was deleted) kept showing the old picture from Cloudflare, Vercel's
// image optimizer and browsers. The index keeps the names readable and ordered.
export function productImageKeys(
  productSlug: string,
  index: number,
  token: string = newKeyToken(),
): ProductImageKeys {
  const base = `products/${productSlug}/${index}-${token}`
  return { storageKey: `${base}.webp`, squareStorageKey: `${base}-square.webp` }
}

// The name photos had before every upload got a token. The WordPress import
// minted these in gallery order, and its follow-up scripts find them by it.
export function legacyProductImageKey(productSlug: string, index: number): string {
  return `products/${productSlug}/${index}.webp`
}

// Reads both shapes: the older plain `12.webp` and the current `12-a1b2c3d4.webp`.
export function nextImageKeyIndex(existingKeys: readonly string[]): number {
  const used = existingKeys
    .map((key) => KEY_NAME_PATTERN.exec(key.split('/').at(-1) ?? '')?.[1])
    .filter((index): index is string => index !== undefined)
    .map(Number)

  return used.length === 0 ? 0 : Math.max(...used) + 1
}

function newKeyToken(): string {
  return randomBytes(KEY_TOKEN_BYTES).toString('hex')
}
