// What the second variant choice asks for. Clothing is cut in sizes; a
// Starlink cover is cut to the dish, so its "size" is the dish generation the
// buyer owns (owner, 20.10.2026), and the page and the packing card name it so.
export const SizeAxis = {
  Size: 'size',
  StarlinkModel: 'starlinkModel',
} as const
export type SizeAxis = (typeof SizeAxis)[keyof typeof SizeAxis]

export type OptionDimensions = {
  readonly widthMm: number
  readonly heightMm: number
}

// The dish each Starlink model is cut to, as the variants name it in their
// Size option. A model is a size listed here: a new dish is one more line,
// and every page that offers models picks it up.
const STARLINK_DISHES: Readonly<Record<string, OptionDimensions>> = {
  'Gen 2': { widthMm: 513, heightMm: 303 },
  'Gen 3 / Gen 4': { widthMm: 594, heightMm: 383 },
}

type SizeAxisSpec = {
  // A cover fits one dish only, so its model is spelled out wherever the
  // buyer could get it wrong: on the catalogue card and on the cart line
  // (owner, 21.10.2026). A clothing size stays plain text.
  readonly isProminent: boolean
}

const SIZE_AXIS_SPECS: Readonly<Record<SizeAxis, SizeAxisSpec>> = {
  [SizeAxis.Size]: { isProminent: false },
  [SizeAxis.StarlinkModel]: { isProminent: true },
}

export function sizeAxisOf(sizes: readonly string[]): SizeAxis {
  const isStarlinkModel =
    sizes.length > 0 && sizes.every((size) => Object.hasOwn(STARLINK_DISHES, size))
  return isStarlinkModel ? SizeAxis.StarlinkModel : SizeAxis.Size
}

export function isSizeAxisProminent(axis: SizeAxis): boolean {
  return SIZE_AXIS_SPECS[axis].isProminent
}

export function sizeDimensionsOf(size: string): OptionDimensions | null {
  return Object.hasOwn(STARLINK_DISHES, size) ? (STARLINK_DISHES[size] ?? null) : null
}

// Printed under the model's name so the buyer can tell the dishes apart with
// a tape measure (owner, 20.10.2026).
export function sizeNoteOf(size: string): string | null {
  const dimensions = sizeDimensionsOf(size)
  return dimensions ? `${dimensions.widthMm} × ${dimensions.heightMm} мм` : null
}
