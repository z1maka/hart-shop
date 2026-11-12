'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { markChatSaleAction } from '@/features/admin/actions/order-actions'
import { errorText } from '@/features/admin/ui/messages'
import { ChatSaleChannel } from '@/features/orders/model/chat-sale'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogClose } from '@/components/ui/Dialog'

type ChatSaleMarkerProps = {
  readonly orderId: string
}

const CHOICES: readonly { readonly channel: ChatSaleChannel; readonly label: string }[] = [
  { channel: ChatSaleChannel.InstagramDirectAd, label: 'С рекламы' },
  { channel: ChatSaleChannel.InstagramDirect, label: 'Без рекламы' },
]

// A sale agreed in Instagram Direct and placed for the buyer: the site never
// saw the visit, so the admin names where the buyer came from.
export function ChatSaleMarker({ orderId }: ChatSaleMarkerProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function mark(channel: ChatSaleChannel) {
    setError(null)
    startTransition(async () => {
      const result = await markChatSaleAction({ orderId, channel })
      setIsOpen(false)
      if (!result.ok) {
        setError(errorText(result.error))
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="mt-3 grid gap-2">
      <div>
        <Button variant="secondary" size="sm" onClick={() => setIsOpen(true)}>
          Заказ из Instagram Direct
        </Button>
      </div>
      {error ? <p className="text-[12.5px] text-alert">{error}</p> : null}
      <Dialog
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title="Заказ из Instagram Direct"
        className="max-w-[440px]"
      >
        <p className="text-[13.5px] leading-relaxed text-muted">
          Покупатель договорился в переписке, а сайт его визита не видел. Откуда он написал? С
          рекламы — источник станет «Meta (реклама) · Instagram · Direct»; сам — «Соцсети · Instagram
          · Direct».
        </p>
        <div className="flex flex-wrap justify-end gap-2.5 pt-1">
          <DialogClose asChild>
            <Button variant="secondary" size="sm" disabled={isPending}>
              Отмена
            </Button>
          </DialogClose>
          {CHOICES.map((choice) => (
            <Button
              key={choice.channel}
              size="sm"
              disabled={isPending}
              onClick={() => mark(choice.channel)}
            >
              {choice.label}
            </Button>
          ))}
        </div>
      </Dialog>
    </div>
  )
}
