// What goes on an invoice. Kept in one place because it appears on the proforma,
// in the imprint and in customs paperwork, and the three must not drift apart.
export const COMPANY = {
  legalName: 'ФОП Масний Олександр Сергійович',
  tradingName: 'Гарт',
  // As the ЄДР extract states it (21.10.2026): Google checks the seller's
  // address against the registry, so it is copied, not reworded.
  addressLines: ['вул. Авангардна, будинок 17, 23', 'м. Миколаїв, Миколаївська обл.', '54034'],
  taxId: '3172012013',
  phone: '+380 96 520 33 25',
  phoneHref: 'tel:+380965203325',
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
