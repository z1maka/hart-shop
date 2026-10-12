'use client'

import type { ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogClose } from '@/components/ui/Dialog'

type ConfirmDialogProps = {
  readonly isOpen: boolean
  readonly onOpenChange: (isOpen: boolean) => void
  readonly title: string
  readonly children: ReactNode
  readonly confirmLabel: string
  readonly cancelLabel: string
  readonly isPending: boolean
  readonly onConfirm: () => void
  // A step that cannot be undone is drawn in the alert colour, so it does
  // not look like the harmless default next to it.
  readonly isDestructive?: boolean
}

export function ConfirmDialog({
  isOpen,
  onOpenChange,
  title,
  children,
  confirmLabel,
  cancelLabel,
  isPending,
  onConfirm,
  isDestructive = false,
}: ConfirmDialogProps) {
  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} title={title} className="max-w-[440px]">
      <div className="text-[13.5px] leading-relaxed text-muted">{children}</div>
      <div className="flex flex-wrap justify-end gap-2.5 pt-1">
        <DialogClose asChild>
          <Button variant="secondary" size="sm" disabled={isPending}>
            {cancelLabel}
          </Button>
        </DialogClose>
        <Button
          size="sm"
          onClick={onConfirm}
          disabled={isPending}
          className={isDestructive ? 'bg-alert hover:bg-alert/90' : undefined}
        >
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  )
}
