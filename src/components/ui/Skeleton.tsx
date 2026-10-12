import { cn } from '@/lib/utils'

type SkeletonProps = {
  readonly className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('animate-pulse rounded-chip bg-hover', className)} aria-hidden />
}
