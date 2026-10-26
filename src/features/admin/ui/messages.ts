import type { ActionError } from '@/lib/action-result'

// The panel speaks Russian, the domain speaks codes: a service throwing
// ProductSlugTakenError must not put an English sentence on this screen.
const MESSAGES: Record<string, string> = {
  UNAUTHORIZED: 'Сессия закончилась — войдите заново.',
  FORBIDDEN: 'Недостаточно прав для этого действия.',
  VALIDATION_FAILED: 'Проверьте заполненные поля.',
  STALE_FORM:
    'Эта вкладка открыта до обновления сайта — перезагрузите страницу и сохраните ещё раз.',
  CATEGORY_SLUG_TAKEN: 'Такой адрес категории уже занят.',
  PRODUCT_SLUG_TAKEN: 'Такой адрес товара уже занят.',
  PRODUCT_SKU_TAKEN: 'Такой артикул уже используется.',
  PRODUCT_NOT_FOUND: 'Товар не найден.',
  UNSUPPORTED_IMAGE: 'Файл не подходит: нужен JPEG, PNG, WebP или AVIF до 4 МБ.',
  RATE_LIMITED: 'Слишком много попыток. Подождите минуту и повторите.',
  ORDER_NOT_FOUND: 'Заказ не найден.',
  IMAGE_NOT_FOUND: 'Это фото уже удалено — обновите страницу.',
  ORDER_TRANSITION_INVALID: 'Такой переход статуса невозможен — обновите страницу.',
  CATEGORY_ORDER_STALE: 'Список категорий изменился — обновите страницу и перетащите снова.',
  CARRIER_UNAVAILABLE: 'Нова Пошта не отвечает. Подождите минуту и повторите.',
  CARRIER_ANSWER_MALFORMED:
    'Нова Пошта ответила неожиданно. Проверьте кабинет: накладная могла создаться — не повторяйте, пока не проверите.',
  PICKUP_POINT_NOT_FOUND:
    'Отделения из заказа нет в справочнике Новой Почты — возможно, оно закрылось. Уточните у покупателя.',
  WAYBILL_NOT_ISSUABLE: 'Для этого заказа накладную нужно создать в кабинете Новой Почты.',
  WAYBILL_ALREADY_ISSUED: 'У заказа уже есть накладная — обновите страницу.',
  WAYBILL_LOCKED: 'Посылка уже у Новой Почты: накладную можно отменить только в кабинете.',
  WAYBILL_MISSING: 'У заказа нет накладной — обновите страницу.',
  WAYBILL_NOT_EDITABLE:
    'Посылка уже у Новой Почты: сумму наложки теперь меняют только заявкой в кабинете Новой Почты.',
  WAYBILL_NOT_AT_CARRIER:
    'Новая Почта не нашла эту накладную: возможно, её удалили в кабинете или перенесли дату отправки. Проверьте кабинет и обновите страницу.',
  WAYBILL_EDITED_IN_CABINET:
    'В накладной в кабинете добавлены упаковка или особый груз — сумму контроля оплаты измените там же, в кабинете.',
  PREPAYMENT_CHANGED:
    'Предоплату только что изменили в другой вкладке. Обновите страницу и сохраните сумму ещё раз — тогда и ТТН получит её.',
  PREPAYMENT_NOT_COD: 'Предоплата бывает только у заказа с наложенным платежом.',
  PREPAYMENT_COVERS_TOTAL:
    'Предоплата должна быть меньше суммы заказа: если покупатель оплатил всё, наложенный платёж не нужен.',
  RETURN_NOT_OPEN: 'Этот возврат уже в архиве — обновите страницу.',
  WAYBILL_ORDER_CLOSED:
    'Заказ уже отправлен или отменён — накладная ему не нужна. Обновите страницу.',
  CARRIER_ACCOUNT_UNAVAILABLE:
    'Этот кабинет отключён, удалён или для него не выбран склад отправки — выберите другой или проверьте «Настройки → Новая Почта».',
  BANK_ACCOUNT_NOT_FOUND: 'Счёт не найден — обновите страницу.',
  BANK_ACCOUNT_IBAN_TAKEN: 'Счёт с таким IBAN уже есть в списке.',
  BANK_ACCOUNT_ACTIVE: 'Этот счёт показывается на сайте — сначала сделайте активным другой.',
  TRACKING_FROM_WAYBILL:
    'Номер выдан Новой Почтой при создании накладной. Чтобы изменить его, удалите накладную.',
}

// The carrier says in its own words what is wrong — a phone it does not
// like, a branch that no longer takes parcels — and that is more useful to
// the admin than any sentence of ours.
const CARRIER_REJECTED_CODE = 'CARRIER_REJECTED'
const CARRIER_REJECTED_WITHOUT_REASON =
  'Нова Пошта отклонила запрос без объяснения — проверьте данные в кабинете.'

const FALLBACK = 'Что-то пошло не так. Попробуйте ещё раз.'

// Validation errors carry the offending field name so the panel can point at
// it; anything unrecognised falls back to the generic sentence.
const FIELD_LABELS: Record<string, string> = {
  sku: 'Артикул',
  slug: 'Адрес страницы',
  title: 'Название на витрине',
  shortTitle: 'Короткое название для списков',
  seoTitle: 'Заголовок в Google',
  seoDescription: 'Описание в Google',
  description: 'Описание на витрине',
  categoryId: 'Категория',
  googleProductCategory: 'Категория Google',
  price: 'Обычная цена',
  salePrice: 'Цена со скидкой',
  wholesalePrice: 'Оптовая цена',
  wholesaleMinQty: 'Опт от, шт',
  weight: 'Вес',
  weightKg: 'Вес',
  layers: 'Слоёв ткани',
  summary: 'Краткое описание',
  variantColor: 'Первый цвет',
  variantStock: 'Остаток',
  variantCover: 'Фото варианта',
  name: 'Название',
  position: 'Позиция в хедере',
  trackingUrl: 'Ссылка на отслеживание',
  invoiceNumber: 'Номер счёта',
  weightGrams: 'Вес посылки (от 0,1 до 30 кг)',
  firstName: 'Имя получателя',
  lastName: 'Фамилия получателя',
  phone: 'Телефон получателя',
  pointRef: 'Отделение',
  settlementName: 'Город',
  cityRef: 'Город',
  cityName: 'Город',
  streetRef: 'Улица',
  streetName: 'Улица',
  house: 'Дом',
  flat: 'Квартира',
  cargoDescription: 'Описание груза',
  prepaidHryvnias: 'Предоплата',
  recipient: 'Получатель',
  iban: 'IBAN — 29 символов, начинается с UA',
  taxId: 'ИНН / ЕДРПОУ получателя — 8 или 10 цифр',
  bankName: 'Банк',
  bankEdrpou: 'ЕДРПОУ банка — 8 цифр',
}

export function errorText(error: ActionError): string {
  const field = FIELD_LABELS[error.message]
  if (field) return `Проверьте поле «${field}»${error.hint ? `: ${error.hint}` : '.'}`
  if (error.code === CARRIER_REJECTED_CODE) {
    return error.message
      ? `Нова Пошта отклонила запрос: ${error.message}`
      : CARRIER_REJECTED_WITHOUT_REASON
  }

  return MESSAGES[error.code] ?? FALLBACK
}
