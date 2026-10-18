'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type DialogProps = {
  readonly isOpen: boolean
  readonly onOpenChange: (isOpen: boolean) => void
  readonly title: string
  readonly placement?: DialogPlacement
  readonly className?: string
  readonly children: ReactNode
}

type DialogPlacement = 'center' | 'right' | 'fullscreen'

const PLACEMENT_CLASSES: Record<DialogPlacement, string> = {
  center: 'left-1/2 top-1/2 w-[min(560px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-card',
  right: 'right-0 top-0 h-full w-[min(380px,90vw)] shadow-[-10px_0_40px_rgb(35_36_29_/_0.2)]',
  fullscreen: 'inset-3 rounded-card sm:inset-6',
}

export function Dialog({
  isOpen,
  onOpenChange,
  title,
  placement = 'center',
  className,
  children,
}: DialogProps) {
  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/45" />
        <DialogPrimitive.Content
          className={cn(
            'fixed z-50 flex flex-col gap-4 bg-surface p-6 text-ink',
            PLACEMENT_CLASSES[placement],
            className,
          )}
        >
          <DialogPrimitive.Title className="font-display text-[17px] font-bold">
            {title}
          </DialogPrimitive.Title>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export const DialogClose = DialogPrimitive.Close
