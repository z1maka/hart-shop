import type { WaybillSenderView } from '@/features/orders'

export function senderLine(sender: WaybillSenderView, branchLabel: string | null): string {
  return branchLabel ? `${sender.senderName} · ${branchLabel}` : sender.senderName
}

// The default cabinet is the one already chosen: the everyday waybill needs
// no extra click.
export function defaultSenderId(senders: readonly WaybillSenderView[]): string | null {
  return (senders.find((sender) => sender.isDefault) ?? senders[0])?.id ?? null
}

// The button names the sender: a waybill from the wrong cabinet is a label
// reprinted by hand, so the choice is repeated where it is confirmed.
export function issueButtonLabel(
  senders: readonly WaybillSenderView[],
  chosenId: string | null,
): string {
  const chosen = senders.find((sender) => sender.id === chosenId)
  return chosen ? `Создать ТТН от «${chosen.name}»` : 'Создать ТТН'
}
