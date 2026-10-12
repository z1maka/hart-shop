// What goes on an invoice. Kept in one place because it appears on the proforma,
// in the imprint and in customs paperwork, and the three must not drift apart.
export const COMPANY = {
  legalName: 'ФОП Косенко Микола Степанович',
  tradingName: 'Гарт',
  addressLines: ['Ukraine'],
  taxId: '3251211798',
  phone: '+380 63 063 06 77',
  phoneHref: 'tel:+380630630677',
  email: 'office@hart-shop.com',
  site: 'hart-shop.com',
} as const

// Parcels leave from this branch, and returns come back to it: the same
// counterparty and the same phone the waybills carry, so a buyer sending a
// parcel back writes exactly what our own labels say.
export const RETURNS_POINT = {
  carrier: 'Нова Пошта',
  city: 'м. Миколаїв',
  branch: 'Відділення №30',
  street: 'вул. Будівельників, 18/6',
} as const
