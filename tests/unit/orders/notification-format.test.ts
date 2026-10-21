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
  packingItemLines,
  parcelRefusedTelegramText,
  quickOrderReminderTelegramText,
  REVIEW_REQUEST_MAIL,
  PAYMENT_ROUTE_RU,
  toPackingItem,
  waybillIssuedTelegramText,
  waybillLabelCaption,
  type PackingItem,
  type PackingSource,
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
  const product = {
    name: 'Пончо Model FX-2 з Molle',
    url: 'https://fox-armor.com.ua/product/fx-2/#reviews',
  }

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

function packingSource(overrides: Partial<PackingSource>): PackingSource {
  return {
    quantity: 1,
    productTitle: 'Зимовий самоохолоджуваючий чохол на Starlink з вентиляцією і 3D-сіткою',
    variantLabel: 'Білий',
    packingTitle: 'чохол на старлінк з ребрами+ сітка',
    shortTitle: 'Зимовий чохол на Starlink з 3D-сіткою',
    color: 'Білий',
    size: null,
    ...overrides,
  }
}

describe('toPackingItem', () => {
  it('names the line the way the workshop does', () => {
    expect(toPackingItem(packingSource({}))).toEqual({
      name: 'чохол на старлінк з ребрами+ сітка',
      color: 'Білий',
      size: null,
      quantity: 1,
    })
  })

  it('carries the size the bought variant is cut to', () => {
    expect(toPackingItem(packingSource({ size: 'Gen 3 / Gen 4' })).size).toBe('Gen 3 / Gen 4')
  })

  it('does not pass a size-only label off as a colour', () => {
    const item = toPackingItem(packingSource({ color: null, size: 'XL', variantLabel: 'XL' }))
    expect(item).toMatchObject({ color: null, size: 'XL' })
  })

  it('falls back to the short title, then to the title the buyer saw', () => {
    expect(toPackingItem(packingSource({ packingTitle: null })).name).toBe(
      'Зимовий чохол на Starlink з 3D-сіткою',
    )
    expect(toPackingItem(packingSource({ packingTitle: ' ', shortTitle: null })).name).toBe(
      'Зимовий самоохолоджуваючий чохол на Starlink з вентиляцією і 3D-сіткою',
    )
  })

  it('keeps the bought colour once the variant is gone', () => {
    const item = toPackingItem(
      packingSource({ packingTitle: null, shortTitle: null, color: null }),
    )
    expect(item.color).toBe('Білий')
  })

  it('has no colour for a product sold in one kind', () => {
    expect(toPackingItem(packingSource({ color: null, variantLabel: '' })).color).toBeNull()
  })
})

describe('packingItemLines', () => {
  const item: PackingItem = {
    name: 'пончо усиленный + сетка',
    color: 'Зимовий мультикам',
    size: null,
    quantity: 1,
  }

  it('prints the workshop name and the colour in the owner\u2019s words', () => {
    expect(packingItemLines(item)).toEqual(['пончо усиленный + сетка', 'колір: зимовий мультикам'])
  })

  it('adds the count only when there is more than one', () => {
    expect(packingItemLines({ ...item, quantity: 3 })).toContain('кількість: 3')
    expect(packingItemLines(item).join('\n')).not.toContain('кількість')
  })

  it('leaves the colour line out for a colourless product', () => {
    expect(packingItemLines({ ...item, color: null })).toHaveLength(1)
  })

  it('names the Starlink model a cover is cut to, or the size of anything else', () => {
    expect(packingItemLines({ ...item, color: 'Олива', size: 'Gen 3 / Gen 4' })).toEqual([
      'пончо усиленный + сетка',
      'колір: олива',
      'модель: Gen 3 / Gen 4',
    ])
    expect(packingItemLines({ ...item, size: 'XL' })).toContain('розмір: XL')
  })
})

describe('waybillIssuedTelegramText', () => {
  const cover: PackingItem = {
    name: 'чохол на старлінк з ребрами+ сітка',
    color: 'Мультикам',
    size: 'Gen 3 / Gen 4',
    quantity: 1,
  }
  const notice: WaybillNotice = {
    orderId: '00000000-0000-0000-0000-000000000009',
    orderNumber: 'HART-2026-000008',
    waybillNumber: '20451566991757',
    items: [cover],
  }

  it('says the waybill, the order and what goes in the box, nothing else', () => {
    expect(waybillIssuedTelegramText(notice)).toBe(
      [
        '<b>ТТН 20451566991757 — заказ HART-2026-000008</b>',
        '',
        'Товары',
        'чохол на старлінк з ребрами+ сітка',
        'колір: мультикам',
        'модель: Gen 3 / Gen 4',
      ].join('\n'),
    )
  })

  it('carries no links', () => {
    expect(waybillIssuedTelegramText(notice)).not.toMatch(/https?:|href=/)
  })

  it('parts the lines with a blank line, one block per product', () => {
    const blanket: PackingItem = { name: 'одеяло', color: null, size: null, quantity: 2 }
    expect(waybillIssuedTelegramText({ ...notice, items: [cover, blanket] })).toContain(
      'модель: Gen 3 / Gen 4\n\nодеяло\nкількість: 2',
    )
  })

  it('escapes what the workshop name holds', () => {
    expect(
      waybillIssuedTelegramText({ ...notice, items: [{ ...cover, name: 'чохол <A&B>' }] }),
    ).toContain('чохол &lt;A&amp;B&gt;')
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
