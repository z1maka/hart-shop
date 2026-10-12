export type FabricLayer = {
  readonly number: string
  readonly swatchClass: string
}

export const FABRIC_LAYERS: readonly FabricLayer[] = [
  { number: '01', swatchClass: 'layer-swatch-shell' },
  { number: '02', swatchClass: 'layer-swatch-barrier' },
  { number: '03', swatchClass: 'layer-swatch-spacer' },
  { number: '04', swatchClass: 'layer-swatch-inner' },
]
