import { describe, expect, it } from 'vitest'
import type { OrderItemRow } from '@/features/orders/repository/order-repository'
import {
  bankTransferLines,
  buyerShippingLine,
  buyerThanksLine,
  buyerTotalLabel,
  escapeHtml,
  itemLines,
  money,
  orderPlacedSmsText,
  orderShippedSmsText,
  parcelRefusedTelegramText,
  quickOrderReminderTelegramText,
  REVIEW_REQUEST_MAIL,
  PAYMENT_ROUTE_RU,
  waybillIssuedTelegramText,
  waybillLabelCaption,
  type WaybillNotice,
} from '@/features/orders/model/notification-format'
import { Carrier, PaymentRoute } from '@/db/enums'

function item(overrides: Partial<OrderItemRow>): OrderItemRow {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    orderId: '00000000-0000-0000-0000-000000000002',
    variantId: null,
    sku: 'SKU-1',
    productSlug: 'poncho',
    productTitle: 'Пончо Multi 3',
    variantLabel: 'Мультикам',
    quantity: 2,
    unitPriceCents: 295_000,
    currency: 'UAH',
    weightGrams: 1200,
    imageStorageKey: null,
    createdAt: new Date('2026-09-16T00:00:00Z'),
    ...overrides,
  }
}

describe('itemLines', () => {
  it('renders quantity, variant and the line total', () => {
    const [line] = itemLines([item({})])
    expect(line).toContain('2 × Пончо Multi 3 (Мультикам)')
    expect(line).toContain(money(590_000))
  })

  it('omits the parentheses when the variant label is blank', () => {
    const [line] = itemLines([item({ variantLabel: '' })])
    expect(line).toContain('2 × Пончо Multi 3 —')
    expect(line).not.toContain('()')
  })
})

describe('PAYMENT_ROUTE_RU', () => {
  it('covers every payment route', () => {
    for (const route of Object.values(PaymentRoute)) {
      expect(PAYMENT_ROUTE_RU[route]).toBeTruthy()
    }
  })
})

describe('escapeHtml', () => {
  it('escapes markup-significant characters', () => {
    expect(escapeHtml('<b>&"</b>')).toBe('&lt;b&gt;&amp;&quot;&lt;/b&gt;')
  })
})

describe('buyer confirmation lines', () => {
  it('describes a zero shipping charge as the carrier tariff, not as free', () => {
    const line = buyerShippingLine('Нова Пошта', 0)
    expect(line).toContain('за тарифами перевізника')
    expect(line).not.toContain('0,00')
  })

  it('prints a real shipping charge as money', () => {
    expect(buyerShippingLine('Нова Пошта', 12_000)).toContain(money(12_000))
  })

  it('tells a card buyer the order is already paid', () => {
    expect(buyerTotalLabel(PaymentRoute.Card)).toBe('Сплачено карткою')
    expect(buyerThanksLine('FOX-1', PaymentRoute.Card)).toContain('оплачене')
  })

  it('asks for payment on delivery routes', () => {
    expect(buyerTotalLabel(PaymentRoute.CashOnDelivery)).toBe('Разом до сплати')
    expect(buyerThanksLine('FOX-1', PaymentRoute.CashOnDelivery)).toContain('прийняте')
  })
})

describe('quickOrderReminderTelegramText', () => {
  it('names the wait, the buyer and what they ordered', () => {
    const text = quickOrderReminderTelegramText({
      orderId: '00000000-0000-0000-0000-000000000009',
      orderNumber: 'FOX-2026-000020',
      waitingHours: 2,
      recipient: '',
      phone: '+380 63 000 00 00',
      items: [item({ quantity: 1 })],
      adminOrderUrl: 'https://fox-armor.com.ua/admin/orders/x/',
    })

    expect(text).toContain('Заявка FOX-2026-000020 ждёт звонка уже 2 ч')
    expect(text).toContain('Покупатель: без имени, +380 63 000 00 00')
    expect(text).toContain('1 × Пончо Multi 3 (Мультикам)')
    expect(text).toContain('href="https://fox-armor.com.ua/admin/orders/x/"')
  })
})

describe('review request mail', () => {
  const product = { name: 'Пончо Model FX-2 з Molle', url: 'https://fox-armor.com.ua/product/fx-2/#reviews' }

  it('names the product in the mail subject', () => {
    expect(REVIEW_REQUEST_MAIL.subject(product)).toBe('Як вам Пончо Model FX-2 з Molle?')
  })
})

describe('orderShippedSmsText', () => {
  it('names the order, the carrier and the waybill', () => {
    expect(orderShippedSmsText('FOX-2026-000019', Carrier.NovaPost, '20451545416797')).toBe(
      'Замовлення FOX-2026-000019 відправлено Новою Поштою. ТТН 20451545416797.',
    )
  })

  it('leaves the waybill out when there is none yet', () => {
    expect(orderShippedSmsText('FOX-2026-000019', null, null)).toBe(
      'Замовлення FOX-2026-000019 відправлено Новою Поштою.',
    )
  })
})

describe('orderPlacedSmsText', () => {
  const url = 'https://fox-armor.com.ua/order/abcdefghijklmnopqrstuvwxyz012345/'

  it('tells a quick-order buyer that a consultant will call', () => {
    const text = orderPlacedSmsText('FOX-2026-000123', url, true)
    expect(text).toContain("Наш консультант скоро зв'яжеться з вами")
    expect(text).toContain(url)
  })

  it('keeps the plain confirmation for a full checkout', () => {
    expect(orderPlacedSmsText('FOX-2026-000123', url, false)).toBe(
      `Ваше замовлення FOX-2026-000123 прийнято. Дякуємо! Відстеження: ${url}`,
    )
  })
})

describe('waybillIssuedTelegramText', () => {
  const notice: WaybillNotice = {
    orderId: '00000000-0000-0000-0000-000000000009',
    orderNumber: 'FOX-2026-000011',
    waybillNumber: '20451539841508',
    trackingUrl: 'https://novaposhta.ua/tracking/?cargo_number=20451539841508',
    adminOrderUrl: 'https://fox-armor.com.ua/admin/orders/abc/',
    recipient: 'Євген Тестовий',
    phone: '+380 63 063 06 77',
    sender: 'ФОП Косенко М. С. · Миколаїв · Відділення №30',
    destination: 'Відділення №1: просп. Героїв України, 13 · м. Миколаїв',
    weightGrams: 2400,
    declaredValueCents: 590_000,
    codCents: 590_000,
    issuedBy: 'office@fox-armor.org',
    items: [item({})],
  }

  it('leaves the sender line out without a cabinet, rather than printing nothing', () => {
    // A shop still on the single environment cabinet has nothing to name.
    expect(waybillIssuedTelegramText({ ...notice, sender: null })).not.toContain('Отправитель:')
  })

  it('carries what the packer needs: number, recipient, branch, weight, money, contents', () => {
    const text = waybillIssuedTelegramText(notice)
    expect(text).toContain('<b>ТТН 20451539841508 — заказ FOX-2026-000011</b>')
    expect(text).toContain('Получатель: Євген Тестовий, +380 63 063 06 77')
    expect(text).toContain('Отправитель: ФОП Косенко М. С. · Миколаїв · Відділення №30')
    expect(text).toContain('Куда: Відділення №1')
    expect(text).toContain('Вес: 2,4 кг')
    expect(text).toContain(`Контроль оплаты: ${money(590_000)}`)
    expect(text).toContain('• 2 × Пончо Multi 3 (Мультикам)')
    expect(text).toContain('Создал: office@fox-armor.org')
    expect(text).toContain('href="https://novaposhta.ua/tracking/?cargo_number=20451539841508"')
  })

  it('says a prepaid parcel collects nothing', () => {
    expect(waybillIssuedTelegramText({ ...notice, codCents: 0 })).toContain(
      'Контроль оплаты: нет — заказ оплачен',
    )
  })

  it('escapes what the buyer typed', () => {
    expect(waybillIssuedTelegramText({ ...notice, recipient: '<b>Іван</b> & Ко' })).toContain(
      '&lt;b&gt;Іван&lt;/b&gt; &amp; Ко',
    )
  })
})

describe('waybillLabelCaption', () => {
  it('names the label, the waybill and the order', () => {
    expect(waybillLabelCaption('20451539841508', 'FOX-2026-000011')).toBe(
      'Этикетка 100×100 · ТТН 20451539841508 · заказ FOX-2026-000011',
    )
  })
})

describe('parcelRefusedTelegramText', () => {
  const notice = {
    orderId: '00000000-0000-0000-0000-000000000009',
    orderNumber: 'FOX-2026-000042',
    waybillNumber: '20451539698513',
    statusText: 'Відмова одержувача',
    recipient: 'Микола <Косенко>',
    phone: '+380 63 063 06 77',
    codCents: 645_000,
    adminOrderUrl: 'https://fox-armor.com.ua/admin/orders/abc/',
  }

  it('names the order, the waybill, the carrier words and the money at stake', () => {
    const text = parcelRefusedTelegramText(notice)
    expect(text).toContain('<b>Отказ от посылки — заказ FOX-2026-000042</b>')
    expect(text).toContain('ТТН 20451539698513: Відмова одержувача')
    expect(text).toContain('Микола &lt;Косенко&gt;, +380 63 063 06 77')
    expect(text).toContain(`Контроль оплаты: ${money(645_000)}`)
    expect(text).toContain('<a href="https://fox-armor.com.ua/admin/orders/abc/">')
  })

  it('says where the return waits', () => {
    expect(parcelRefusedTelegramText(notice)).toContain('ждёт во вкладке «Возвраты»')
    expect(parcelRefusedTelegramText(notice)).not.toContain('верните деньги')
  })

  it('reminds to give a prepaid buyer the money back', () => {
    const text = parcelRefusedTelegramText({ ...notice, codCents: 0, phone: null })
    expect(text).toContain('Контроль оплаты: нет — заказ оплачен')
    expect(text).toContain('верните деньги покупателю')
  })
})

describe('bankTransferLines', () => {
  const requisites = {
    recipient: 'ФОП Косенко Микола Степанович',
    iban: 'UA173220010000026005340071625',
    taxId: '3251211798',
    bankName: 'АТ «УНІВЕРСАЛ БАНК»',
    bankEdrpou: '21133352',
  }

  it('puts everything a banking app asks for into the letter', () => {
    const lines = bankTransferLines(requisites, 'FOX-2026-000009', 245000).join('\n')

    expect(lines).toContain('Отримувач: ФОП Косенко Микола Степанович')
    expect(lines).toContain('IBAN: UA17 3220 0100 0002 6005 3400 7162 5')
    expect(lines).toContain('МФО 322001')
    expect(lines).toContain('ЄДРПОУ банку 21133352')
    expect(lines).toContain(`Сума: ${money(245000)}`)
    expect(lines).toContain('Призначення платежу: Оплата за замовлення FOX-2026-000009')
  })

  it('promises the details instead of printing an empty block', () => {
    const [line] = bankTransferLines(null, 'FOX-2026-000009', 245000)

    expect(line).toMatch(/надішлемо окремо/)
  })
})
