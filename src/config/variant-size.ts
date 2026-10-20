// What the second variant choice asks for. Clothing is cut in sizes; a
// Starlink cover is cut to the dish, so its "size" is the dish generation the
// buyer owns (owner, 20.10.2026), and the page and the packing card name it so.
export const SizeAxis = {
  Size: 'size',
  StarlinkModel: 'starlinkModel',
} as const
export type SizeAxis = (typeof SizeAxis)[keyof typeof SizeAxis]

// «Gen 2», «Gen 3 / Gen 4»: the names the variants carry in their Size option.
const STARLINK_MODEL_PATTERN = /^Gen \d/

// The dish each model is cut to, printed under its name so the buyer can tell
// the two apart with a tape measure (owner, 20.10.2026).
const STARLINK_DISH_SIZES: Readonly<Record<string, string>> = {
  'Gen 2': '513 × 303 мм',
  'Gen 3 / Gen 4': '594 × 383 мм',
}

export function sizeNoteOf(size: string): string | null {
  return Object.hasOwn(STARLINK_DISH_SIZES, size) ? (STARLINK_DISH_SIZES[size] ?? null) : null
}

export function sizeAxisOf(sizes: readonly string[]): SizeAxis {
  const isStarlinkModel =
    sizes.length > 0 && sizes.every((size) => STARLINK_MODEL_PATTERN.test(size))
  return isStarlinkModel ? SizeAxis.StarlinkModel : SizeAxis.Size
}
