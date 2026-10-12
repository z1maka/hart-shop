import Image from 'next/image'
import { cn } from '@/lib/utils'

type NovaPoshtaMarkProps = {
  readonly size?: number
  readonly className?: string
}

// The carrier's app icon as supplied by the owner. Buyers recognise the red
// mark faster than the words "Нова Пошта", so it sits next to delivery facts.
export function NovaPoshtaMark({ size = 24, className }: NovaPoshtaMarkProps) {
  return (
    <Image
      src="/brands/nova-poshta.png"
      alt="Нова Пошта"
      width={size}
      height={size}
      className={cn('shrink-0 rounded-[22%]', className)}
      style={{ width: size, height: size }}
    />
  )
}
