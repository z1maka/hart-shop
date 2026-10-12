import { DestinationKind } from '@/features/orders/model/destination'

type DestinationMark = {
  // The coloured pill in the «Отделение» column; a settled branch needs none.
  readonly chip: string | null
  readonly chipClass: string
  // What stands in the column while the order has no branch to print.
  readonly fallback: string
}

// How the list marks where a parcel goes: quiet for what is settled, soft
// for what waits on a call, filled for a branch the carrier denies.
const DESTINATION_MARKS: Record<DestinationKind, DestinationMark> = {
  [DestinationKind.Branch]: { chip: null, chipClass: '', fallback: '—' },
  [DestinationKind.Courier]: {
    chip: 'Курьер',
    chipClass: 'bg-sunken text-muted',
    fallback: 'Адрес в заказе',
  },
  [DestinationKind.Quick]: {
    chip: 'Уточнить отделение',
    chipClass: 'bg-alert-soft text-alert',
    fallback: 'Только телефон',
  },
  [DestinationKind.Manual]: {
    chip: 'Вписано вручную',
    chipClass: 'bg-alert-soft text-alert',
    fallback: 'Без справочника',
  },
  [DestinationKind.UnknownBranch]: {
    chip: 'Нет в справочнике НП',
    chipClass: 'bg-alert text-on-dark',
    fallback: '—',
  },
}

export function destinationMark(kind: DestinationKind): DestinationMark {
  return DESTINATION_MARKS[kind]
}
