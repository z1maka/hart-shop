import sharp from 'sharp'
import { productImageKeys } from '@/lib/product-image-key'
import { putObject, deleteObject } from '@/lib/storage'

// One square canvas for every product shot: the catalogue mixes square studio
// shots with wide flat-lays and spec infographics, so cropping to a portrait
// frame cut products in half. Contain keeps the whole item and the grid still
// lines up.
const TARGET_SIZE = 1600
const CANVAS_BACKGROUND = { r: 255, g: 255, b: 255, alpha: 1 }
const WEBP_QUALITY = 82

export type StoredImage = {
  readonly storageKey: string
  readonly squareStorageKey: string
  readonly width: number
  readonly height: number
}

export async function storeProductImage(
  original: Buffer,
  productSlug: string,
  index: number,
): Promise<StoredImage> {
  // .rotate() applies the EXIF orientation; without it phone photos land sideways.
  const upright = sharp(original).rotate()

  const contained = await upright
    .clone()
    .resize({
      width: TARGET_SIZE,
      height: TARGET_SIZE,
      fit: 'contain',
      background: CANVAS_BACKGROUND,
    })
    .flatten({ background: CANVAS_BACKGROUND })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer()

  // The card grid needs one shape for every product: a centre crop, not a letterbox.
  const squared = await upright
    .clone()
    .resize({ width: TARGET_SIZE, height: TARGET_SIZE, fit: 'cover', position: 'centre' })
    .flatten({ background: CANVAS_BACKGROUND })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer()

  const { storageKey, squareStorageKey } = productImageKeys(productSlug, index)

  await Promise.all([
    putObject({ key: storageKey, body: contained, contentType: 'image/webp' }),
    putObject({ key: squareStorageKey, body: squared, contentType: 'image/webp' }),
  ])

  return { storageKey, squareStorageKey, width: TARGET_SIZE, height: TARGET_SIZE }
}

export async function removeProductImage(image: {
  storageKey: string
  squareStorageKey: string | null
}): Promise<void> {
  await Promise.all([
    deleteObject(image.storageKey),
    image.squareStorageKey ? deleteObject(image.squareStorageKey) : Promise.resolve(),
  ])
}
