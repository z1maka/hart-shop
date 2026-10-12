import { cn } from '@/lib/utils'

type ColorSwatchSize = 'sm' | 'md'

type ColorSwatchProps = {
  readonly name: string
  readonly size?: ColorSwatchSize
  readonly isSelected?: boolean
  readonly className?: string
}

const PATTERN_CLASSES: Record<string, string> = {
  Multicam: 'bg-camo-multicam',
  Мультикам: 'bg-camo-multicam',
  Olive: 'bg-camo-olive',
  Олива: 'bg-camo-olive',
  Pixel: 'bg-camo-pixel',
  Піксель: 'bg-camo-pixel',
  Winter: 'bg-camo-winter',
  Зимовий: 'bg-camo-winter',
  'Winter Multicam': 'bg-camo-winter',
  'Зимовий мультикам': 'bg-camo-winter',
  White: 'bg-camo-white',
  Білий: 'bg-camo-white',
  Coyote: 'bg-camo-coyote',
  Койот: 'bg-camo-coyote',
  Kryptek: 'bg-camo-kryptek',
  Криптек: 'bg-camo-kryptek',
  Leopard: 'bg-camo-leopard',
  Леопард: 'bg-camo-leopard',
  Carbon: 'bg-camo-carbon',
  Карбон: 'bg-camo-carbon',
  'Black Multicam': 'bg-camo-black-multicam',
  'Чорний мультикам': 'bg-camo-black-multicam',
  Black: 'bg-camo-black',
  Чорний: 'bg-camo-black',
  Green: 'bg-camo-green',
  Зелений: 'bg-camo-green',
  Khaki: 'bg-camo-khaki',
  Хакі: 'bg-camo-khaki',
  Camo: 'bg-camo-camo',
  Камуфляж: 'bg-camo-camo',
  // The bought-in gear's own colourways (headphones, backpacks, stretchers).
  Сірий: 'bg-camo-grey',
  'Сірий піксель': 'bg-camo-grey-pixel',
  'Сірий камуфляж': 'bg-camo-grey-camo',
  'Пісочний камуфляж': 'bg-camo-coyote',
  'Зелений камуфляж': 'bg-camo-green',
}

const SIZE_CLASSES: Record<ColorSwatchSize, string> = {
  sm: 'size-4',
  md: 'size-6',
}

export function ColorSwatch({
  name,
  size = 'sm',
  isSelected = false,
  className,
}: ColorSwatchProps) {
  return (
    <span
      title={name}
      className={cn(
        'inline-block rounded-full border border-ink/20',
        SIZE_CLASSES[size],
        PATTERN_CLASSES[name] ?? 'bg-camo-default',
        isSelected && 'outline-2 outline-offset-2 outline-accent',
        className,
      )}
    />
  )
}
