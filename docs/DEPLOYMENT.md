# FOX EU — деплой

> Прод відрізняється від локального **тільки значеннями env**. У коді немає жодного
> `if (isDev)` навколо інфраструктури — це навмисно (ARCHITECTURE.md §9).

## 1. Домени

| Домен | Роль |
|---|---|
| `fox-armor-eu.com` | основний, апекс |
| `foxarmoreu.com` | 301 на основний (захист від друкарської помилки) |

Реєстратор — Cloudflare Registrar: продає за собівартістю, приховування WHOIS безкоштовне,
DNS і R2 в одному місці. `www` віддає 301 на апекс.

## 2. Сервіси

| Сервіс | Замінює локальне | Що взяти |
|---|---|---|
| Vercel | `pnpm dev` | проєкт із цього репозиторію |
| Neon | Docker Postgres | pooled connection string у `DATABASE_URL` |
| Cloudflare R2 | MinIO | бакет + публічний домен для `NEXT_PUBLIC_MEDIA_URL` |
| Resend | Mailpit | SMTP-креденшли + DNS-записи домену |

## 3. Змінні середовища

Усі перелічені в `.env.example`. Відмінності прода:

```
NEXT_PUBLIC_SITE_URL=https://fox-armor-eu.com
DATABASE_URL=<Neon pooled>
S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com
S3_FORCE_PATH_STYLE=false
NEXT_PUBLIC_MEDIA_URL=https://media.fox-armor-eu.com
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_SECURE=true
ORDER_EMAIL_FROM=orders@fox-armor-eu.com
ADMIN_SESSION_SECRET=<openssl rand -base64 32>
SITE_INDEXABLE=false
```

`next.config.ts` виводить дозволений хост для `next/image` із `NEXT_PUBLIC_MEDIA_URL`,
тому окремо його прописувати не треба.

## 4. Пошта

Resend вимагає три DNS-записи на домені: SPF, DKIM і DMARC. Без них листи
підтвердження замовлення підуть у спам. Адреси: `orders@` для транзакційних,
`support@` для відповідей клієнтів.

## 5. Порядок першого деплою

1. Створити Neon-базу, вставити `DATABASE_URL`.
2. `pnpm db:migrate` — на чистій базі накатує всі міграції.
3. `pnpm seed:shipping` — тарифи доставки.
4. `pnpm import:catalog` — каталог із зображеннями в R2.
5. Задеплоїти на Vercel, перевірити `/`, `/shop`, `/product/<slug>`.

## 6. Що має бути закрите ДО зняття noindex

`SITE_INDEXABLE=false` тримає сайт поза пошуком. Перемикати на `true` тільки коли:

- [ ] в imprint реальна юрособа, адреса, реєстраційний номер і VAT — зараз усюди «TBC»
- [ ] працює оплата (Stripe недоступний для UA-юрособи; розглядається Plata by mono)
- [ ] у політиці приватності вказано контролера даних
- [ ] є посилання на платформу ODR

Публікація EU-магазину з порожнім imprint — це не формальність: у Німеччині це
пряма підстава для Abmahnung.
