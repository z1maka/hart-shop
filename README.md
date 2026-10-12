# hart-shop

Український інтернет-магазин на двигуні FOX Armor UA: анти-тепловізорне й анти-дронове
маскувальне спорядження, шоломи, активні навушники, рюкзаки. Кодова база скопійована з
[`fox-armor-ua`](https://github.com/z1maka/fox-armor-ua) (сама походить від
[`fox-armor-eu`](https://github.com/z1maka/fox-armor-eu)); асортимент поки той самий,
вітрина отримає власний дизайн. Українська конфігурація: одна мова, гривня, доставка
Новою Поштою, оплата карткою або накладеним платежем.

## Стек

- **Next.js 16** (App Router, Server Components, PPR) · **React 19**
- **TypeScript** strict
- **Tailwind CSS 4** · Radix primitives
- **Drizzle ORM + PostgreSQL** (Docker локально, Neon у проді)
- **Zod 4** — валідація на всіх межах
- **Vitest** (unit) · **Playwright** (e2e + visual regression)
- Хостинг — **Vercel**; медіа — S3-сумісне сховище (R2); пошта — Resend

## Швидкий старт

```bash
pnpm install
docker compose up -d        # власний стек hart: Postgres 5445, MinIO 9030, Mailpit 1050
cp .env.example .env        # значення вже збігаються з docker-compose
pnpm db:migrate
pnpm dev --port 3020
```

Сайт підніметься на `http://localhost:3020`, листи — у Mailpit на `http://localhost:8050`.

## Команди

| Команда | Що робить |
|---|---|
| `pnpm dev` | dev-сервер |
| `pnpm build` | продакшн-збірка (усі публічні сторінки пререндеряться) |
| `pnpm check` | typecheck + lint + unit-тести |
| `pnpm test:e2e` | Playwright: шлях покупця |
| `pnpm test:visual` | Playwright: візуальна регресія (home / shop / PDP / cart) |
| `pnpm db:generate` / `db:migrate` / `db:studio` | Drizzle: міграції та студія |
| `pnpm admin:create` | створити адміністратора |

## Структура

```
src/
  app/         # роути (App Router): вітрина, адмінка, api-вебхуки
  features/    # фічі: catalog, cart, checkout, orders, analytics, admin…
  components/  # спільні UI-компоненти
  lib/         # утиліти двигуна: money, errors, storage, mailer, nova-post…
  config/      # ринкова конфігурація й бренд (компанія, доставка, оплата)
  db/          # Drizzle-схема і підключення
  messages/    # тексти вітрини (uk)
```

Кожна фіча всередині шарується: `model / repository / services / queries /
actions / ui` — залежності йдуть лише зверху вниз.

## Особливості

- Усі публічні сторінки статичні (`generateStaticParams` + cache tags),
  інвалідація точкова через `revalidateTag`.
- Ціни зберігаються в копійках (integer), форматування за `uk-UA`.
- Накладений платіж (COD) — замовлення без онлайн-оплати, гроші збирає
  перевізник.

## Деплой

Інфраструктура й порядок першого деплою — у [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md).
`scripts/provision-ua-infra.ts` успадкований від FOX і налаштований на його проєкти —
у цьому репозиторії не запускати.
