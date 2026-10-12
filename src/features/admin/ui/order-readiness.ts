import { WaybillReadiness } from '@/features/orders/model/shipment'

type ReadinessCopy = {
  // Shown on the disabled checkbox, and beside the order in the batch result.
  readonly hint: string
  // A gap the admin can close in a minute earns a line in the row itself.
  readonly note: string | null
}

// Why a row cannot join the daily round, in the admin's words.
const READINESS_COPY: Record<WaybillReadiness, ReadinessCopy> = {
  [WaybillReadiness.Ready]: { hint: '', note: null },
  [WaybillReadiness.Issued]: { hint: 'Накладная уже создана', note: null },
  [WaybillReadiness.NoWeight]: {
    hint: 'Не указан вес товара — заполните его в каталоге',
    note: 'Нет веса для ТТН',
  },
  // The «Отделение» column already carries this one in red; a second copy
  // beside the status would say the same thing twice.
  [WaybillReadiness.UnknownPoint]: {
    hint: 'Отделения из заказа нет в справочнике Новой Почты — выберите его заново в заказе',
    note: null,
  },
  [WaybillReadiness.Blocked]: {
    hint: 'Откройте заказ: нужны получатель, отделение или адрес курьера',
    note: null,
  },
}

export function readinessHint(readiness: WaybillReadiness): string {
  return READINESS_COPY[readiness].hint
}

export function readinessNote(readiness: WaybillReadiness): string | null {
  return READINESS_COPY[readiness].note
}
