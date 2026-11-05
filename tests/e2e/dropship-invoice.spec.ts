import { expect, test, type Page } from '@playwright/test'

// The partner flow end to end: a partner order at the drop price, its
// invoice with the next number, and the statistics counting it at the drop
// price. Runs against a database with an admin and a published product that
// has a drop price and a workshop price:
//   E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD — the admin to sign in as;
//   E2E_DROP_SKU — a variant on sale with a drop price (3600-2-MULTICAM).
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? ''
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? ''
const DROP_SKU = process.env.E2E_DROP_SKU ?? '3600-2-MULTICAM'
// The first partner (05.11.2026); a valid РНОКПП is all the form needs.
const PARTNER = { name: `ФОП Тестовий Партнер ${Date.now()}`, taxId: '3165519160' }
const QUANTITY = 2

test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'needs E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD')

async function signIn(page: Page) {
  await page.goto('/admin/login/')
  await page.getByLabel('Почта').fill(ADMIN_EMAIL)
  await page.getByLabel('Пароль').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Войти' }).click()
  await page.waitForURL(/\/admin\/(?!login)/)
}

// «7 100 ₴» → 710000 kopiykas.
function kopiykas(text: string): number {
  const digits = text.replace(/[^\d−-]/g, '').replace('−', '-')
  return Number(digits) * 100
}

async function dropshipRow(page: Page): Promise<{ revenue: number; earnings: number }> {
  await page.goto('/admin/stats/?period=month&channel=dropship')
  const row = page.getByRole('row', { name: /^Дропшиппинг/ })
  const cells = row.getByRole('cell')
  return {
    revenue: kopiykas(await cells.nth(2).innerText()),
    earnings: kopiykas(await cells.nth(4).innerText()),
  }
}

test('a partner order is priced at the drop price, invoiced and counted so', async ({ page }) => {
  await signIn(page)
  const before = await dropshipRow(page)

  await page.goto('/admin/orders/new/')
  await page.getByRole('button', { name: '+ Добавить партнёра' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Название — как в счёте').fill(PARTNER.name)
  await dialog.getByLabel('ЄДРПОУ или РНОКПП').fill(PARTNER.taxId)
  await dialog.getByRole('button', { name: 'Добавить партнёра' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('combobox').first().locator('option:checked')).toHaveText(
    new RegExp(PARTNER.name),
  )

  await page.getByLabel('Номер у партнёра').fill('31805')
  await page.getByLabel('Поиск товара').fill(DROP_SKU)
  const found = page.getByRole('listbox').getByRole('option').filter({ hasText: DROP_SKU }).first()
  const facts = await found.innerText()
  const dropCents = kopiykas(/дроп ([\d\s ]+₴)/.exec(facts)?.[1] ?? '')
  await found.click()
  await expect(page.getByRole('listbox')).toBeHidden()
  await page.getByRole('button', { name: 'Больше' }).click()

  const line = page.getByRole('listitem').filter({ hasText: 'цех' }).first()
  const costCents = kopiykas(/цех ([\d\s ]+₴)/.exec(await line.innerText())?.[1] ?? '')

  await page.getByLabel('ПІБ').fill('Сидоренко Ірина Петрівна')
  await page.getByLabel('Телефон').fill('+380501234567')
  await page.getByRole('button', { name: 'Курьер' }).click()
  await page.getByLabel('Город').fill('Дніпро')
  await page.getByLabel('Улица, дом').fill('просп. Яворницького, 52')
  await page.getByRole('button', { name: /Создать заказ на/ }).click()
  await page.waitForURL(/\/admin\/orders\/[0-9a-f-]{36}\/$/)
  await expect(page.getByText('Дропшиппинг').first()).toBeVisible()

  await page.getByRole('button', { name: 'Выставить счёт' }).click()
  await expect(page.getByLabel('Покупатель — как в счёте')).toHaveValue(PARTNER.name)
  await page.getByRole('button', { name: 'Сохранить и присвоить номер' }).click()
  const issued = page.getByText(/^№ \d+ · /)
  await expect(issued).toBeVisible()
  const number = /№ (\d+)/.exec(await issued.innerText())?.[1] ?? ''
  expect(Number(number)).toBeGreaterThanOrEqual(344)

  await page.getByRole('link', { name: 'Открыть счёт' }).click()
  await expect(
    page.getByRole('heading', { name: `Рахунок на оплату № ${number} від`, exact: false }),
  ).toBeVisible()
  await expect(
    page.getByText(`Оплата за замовлення 31805 згідно з рахунком № ${number}`),
  ).toBeVisible()

  const after = await dropshipRow(page)
  expect(after.revenue - before.revenue).toBe(dropCents * QUANTITY)
  expect(after.earnings - before.earnings).toBe((dropCents - costCents) * QUANTITY)
})
