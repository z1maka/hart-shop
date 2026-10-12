'use client'

import { senderLine } from '@/features/admin/model/waybill-sender'
import type { WaybillSenderView } from '@/features/orders'
import { cn } from '@/lib/utils'

type WaybillSenderPickerProps = {
  readonly senders: readonly WaybillSenderView[]
  readonly branchLabel: string | null
  readonly chosenId: string | null
  readonly onChoose: (id: string) => void
}

// The cabinet a waybill leaves from, picked per order; with a single cabinet
// the list still says who the label will name.
export function WaybillSenderPicker({
  senders,
  branchLabel,
  chosenId,
  onChoose,
}: WaybillSenderPickerProps) {
  if (senders.length === 0) return null

  return (
    <fieldset className="grid gap-1.5">
      <legend className="mb-2 text-[12.5px] font-semibold text-muted">Отправить от</legend>
      {senders.map((sender) => {
        const isChosen = sender.id === chosenId

        return (
          <label
            key={sender.id}
            className={cn(
              'flex cursor-pointer items-center gap-2.5 rounded-control px-3 py-2.5 transition-colors',
              isChosen
                ? 'border-[1.5px] border-accent bg-accent-tint'
                : 'border border-subtle bg-raised hover:border-faint',
            )}
          >
            <input
              type="radio"
              name="waybill-sender"
              value={sender.id}
              checked={isChosen}
              onChange={() => onChoose(sender.id)}
              className="size-4 shrink-0 accent-[var(--color-accent)]"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] font-semibold text-ink">
                {sender.name}
                {sender.isDefault ? ' · по умолчанию' : ''}
              </span>
              <span className="block text-[12px] text-muted">
                {senderLine(sender, branchLabel)}
              </span>
            </span>
          </label>
        )
      })}
    </fieldset>
  )
}
