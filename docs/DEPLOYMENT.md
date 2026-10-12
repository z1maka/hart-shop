# hart-shop — інфраструктура й деплой

> Прод відрізняється від локального **тільки значеннями env**. У коді немає жодного
> `if (isDev)` навколо інфраструктури — це навмисно (ARCHITECTURE.md §9).

Сервіси — окремі проєкти в акаунтах, спільних з FOX Armor. Ресурси FOX (`fox-armor-ua`,
`fox-media-ua`, зона `fox-armor.com.ua`) цей репозиторій не чіпає.

## 1. Домен

Ще не обрано. Від нього залежать: адреса сайту, `media.<домен>` для R2, пошта Resend,
зона Cloudflare і Vercel-проєкт. `www` віддаватиме 301 на апекс, як у FOX.

## 2. Сервіси

| Сервіс | Замінює локальне | hart-shop | Стан на 12.10.2026 |
|---|---|---|---|
| Neon | Docker Postgres | проєкт `hart-shop` (`hidden-dawn-46075367`), eu-central-1, Postgres 18 | створено, схема накатана (56 міграцій), даних немає |
| Cloudflare R2 | MinIO | бакет `hart-media`, тимчасово публічний `*.r2.dev` | створено, порожній |
| Resend | Mailpit | той самий акаунт, що й FOX | домен додається після вибору домену |
| Vercel | `pnpm dev` | проєкт із цього репозиторію | ще не створено |

Значення лежать у `.env.production` (не комітиться). Порожні змінні в ньому — те, що
чекає домену або власних акаунтів магазину: оплата, Нова Пошта, Telegram, SMS, пікселі.

## 3. Локально

`docker compose up -d` піднімає власний стек hart поруч зі стеком FOX:

| Сервіс | Контейнер | Порти |
|---|---|---|
| Postgres | `hart-postgres` | 5445 (користувач і база `hart`) |
| MinIO | `hart-storage` | 9030 API, 9031 консоль (бакет `hart-media`) |
| Mailpit | `hart-mail` | 1050 SMTP, 8050 веб |

Dev-сервер — `pnpm dev --port 3020`. `.env.production.local` тримає локальну
продакшн-збірку на Docker-базі, щоб `pnpm build` не читав прод.

## 4. Змінні середовища прода

Усі перелічені в `.env.example`. Відмінності прода:

```
NEXT_PUBLIC_SITE_URL=https://<домен>
DATABASE_URL=<Neon pooled, проєкт hart-shop>
S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com
S3_BUCKET=hart-media
NEXT_PUBLIC_MEDIA_URL=https://media.<домен>
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_SECURE=true
ORDER_EMAIL_FROM=orders@<домен>
ADMIN_SESSION_SECRET=<openssl rand -hex 32>
SITE_INDEXABLE=false
```

`next.config.ts` виводить дозволений хост для `next/image` із `NEXT_PUBLIC_MEDIA_URL`,
тому окремо його прописувати не треба.

## 5. Пошта

Resend вимагає DNS-записи на домені: SPF, DKIM і DMARC. Без них листи підтвердження
замовлення підуть у спам. Адреси: `orders@` для транзакційних, `support@` для відповідей.

## 6. Порядок першого деплою

1. Обрати домен; додати зону в Cloudflare і домен у Resend.
2. Перенести каталог і медіа в Neon `hart-shop` і R2 `hart-media` (локальний Docker уже
   має копію каталогу FOX).
3. Створити Vercel-проєкт з цього репозиторію, внести env, підключити домен.
4. Перевірити `/`, `/shop/`, `/product/<slug>/`, кошик і чекаут.

## 7. Що має бути закрите ДО зняття noindex

`SITE_INDEXABLE=false` тримає сайт поза пошуком. Перемикати на `true` тільки коли:

- [ ] на сайті реальні реквізити продавця (ФОП або юрособа), а не FOX
- [ ] працює оплата (mono або WayForPay) і накладений платіж через власний кабінет Нової Пошти
- [ ] політика приватності й умови повернення вказують продавця hart
- [ ] власні пікселі й GA4 замість тегів FOX
