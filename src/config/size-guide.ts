export type SizeGuideRow = {
  readonly size: string
  readonly chest: string
  readonly height: string
}

// The standard men's grid the shop sews clothing to. Only letter sizes: a
// helmet's «M (55–59 см)» names its own head girth and needs no table.
export const SIZE_GUIDE_ROWS: readonly SizeGuideRow[] = [
  { size: 'S', chest: '86–94 см', height: '160–170 см' },
  { size: 'M', chest: '94–102 см', height: '170–178 см' },
  { size: 'L', chest: '102–110 см', height: '178–186 см' },
  { size: 'XL', chest: '110–118 см', height: '186–194 см' },
  { size: 'XXL', chest: '118–126 см', height: '194+ см' },
]

// The rows for the sizes a product is actually sold in, in grid order; empty
// when none of its sizes is a letter size, and the table is then not offered.
export function sizeGuideRowsFor(sizes: readonly string[]): readonly SizeGuideRow[] {
  return SIZE_GUIDE_ROWS.filter((row) => sizes.includes(row.size))
}
