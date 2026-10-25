import { z } from 'zod'

const requiredString = z.string().trim().min(1)

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined))

// Accepts a bare address or the RFC 5322 display form, so the From header can
// carry a shop name instead of a naked mailbox.
const senderAddress = z
  .string()
  .trim()
  .refine(
    (value) => {
      const match = /^(?:.*<)?([^<>\s]+@[^<>\s]+\.[^<>\s]+)>?$/.exec(value)
      return match !== null
    },
    { message: 'Expected an email address, optionally as "Name <address>"' },
  )

const envSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url(),
  // Set by next.config.ts from the commit being built; 'dev' locally.
  APP_BUILD_ID: z.string().trim().min(1).default('dev'),
  // Where the admin actually answers. Until the domain points here, the shop
  // address still serves the old site, and a link to it from Telegram lands
  // on its 404. Left empty once they are the same host.
  ADMIN_BASE_URL: optionalString.pipe(z.union([z.url(), z.undefined()])),

  DATABASE_URL: requiredString,

  S3_ENDPOINT: z.url(),
  S3_REGION: requiredString,
  S3_ACCESS_KEY_ID: requiredString,
  S3_SECRET_ACCESS_KEY: requiredString,
  S3_BUCKET: requiredString,
  S3_FORCE_PATH_STYLE: z.stringbool(),
  NEXT_PUBLIC_MEDIA_URL: z.url(),

  SMTP_HOST: requiredString,
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_USER: optionalString,
  SMTP_PASSWORD: optionalString,
  SMTP_SECURE: z.stringbool(),
  ORDER_EMAIL_FROM: senderAddress,
  ORDER_EMAIL_BCC: optionalString,
  // Customer replies should land in the inbox the team already reads, even
  // though the shop sends from its own domain for deliverability.
  ORDER_EMAIL_REPLY_TO: optionalString,
  // Where enquiries from the site's own forms are delivered. Separate from the
  // reply-to because that one is what a customer sees, and this one is us.
  // Optional so a deployment without it still boots — it falls back to the
  // reply-to address, which is the same inbox in practice. An empty value is
  // treated as absent, the way an unset variable in a .env file reads.
  ENQUIRY_EMAIL_TO: optionalString.refine(
    (value) => value === undefined || z.email().safeParse(value).success,
    { message: 'Expected an email address' },
  ),

  // Plata by mono acquiring: the merchant token and the secret the webhook
  // route uses to reject anything that is not monobank.
  MONO_TOKEN: requiredString,

  // Nova Poshta business-cabinet key: the branch and locker directory now,
  // waybills later. Absent = the checkout falls back to courier delivery.
  NOVA_POST_API_KEY: optionalString,
  // Who the waybills are issued for: the cabinet's sender counterparty, its
  // contact person, the city and the branch parcels leave from. All four are
  // printed by `pnpm nova-post:sender`; while any is absent the admin creates
  // waybills in the cabinet by hand.
  NOVA_POST_SENDER_REF: optionalString,
  NOVA_POST_SENDER_CONTACT_REF: optionalString,
  NOVA_POST_SENDER_CITY_REF: optionalString,
  NOVA_POST_SENDER_WAREHOUSE_REF: optionalString,

  ADMIN_SESSION_SECRET: requiredString.min(32),

  // Staging and the pre-launch site must stay out of search until the imprint
  // carries a real legal entity.
  SITE_INDEXABLE: z.stringbool().default(false),

  NEXT_PUBLIC_GA_MEASUREMENT_ID: optionalString,
  GA_API_SECRET: optionalString,
  // The Ads tag inherited from the WordPress site (MIGRATION.md invariant №2).
  // The conversion label comes from the Ads account UI; without it purchases
  // reach GA4 but are never counted as Ads conversions.
  NEXT_PUBLIC_GOOGLE_ADS_ID: optionalString,
  NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL: optionalString,
  // True once the Ads account is a destination of the GA4 Google tag (Tag
  // Manager → Google tag → Destinations): that one gtag.js then serves both,
  // and a separate Ads `config` would download a second copy (149 KB, seen
  // 15.10.2026). Off, the Ads tag is configured on its own.
  NEXT_PUBLIC_GOOGLE_ADS_IN_GOOGLE_TAG: z.stringbool().default(false),
  NEXT_PUBLIC_CLARITY_PROJECT_ID: optionalString,
  // The Merchant Center account: Google Customer Reviews' survey offer on the
  // order page names it. Absent = no offer.
  NEXT_PUBLIC_GOOGLE_MERCHANT_ID: z.coerce.number().int().positive().optional(),
  NEXT_PUBLIC_META_PIXEL_ID: optionalString,
  // The Conversions API copy of the pixel's events (/api/meta/events). Absent
  // = the relay accepts and drops everything, the pixel alone reports.
  META_CAPI_ACCESS_TOKEN: optionalString,
  // From Events Manager → Test events: while set, server events land there
  // instead of the live statistics. Only for checking a deployment.
  META_CAPI_TEST_EVENT_CODE: optionalString,
  NEXT_PUBLIC_TIKTOK_PIXEL_ID: optionalString,

  // The shop's Telegram bot inherited from the WordPress site: new orders are
  // pushed to its chat. Optional so a deployment without the bot still boots —
  // the notifier is a no-op until both values exist.
  TELEGRAM_BOT_TOKEN: optionalString,
  TELEGRAM_CHAT_ID: optionalString,
  // A second chat of the same bot for the packing side: every waybill issued
  // from the admin lands there. Absent = no such messages.
  TELEGRAM_WAYBILL_CHAT_ID: optionalString,

  // TurboSMS: the order-accepted SMS to the buyer. Optional — the notifier is
  // a no-op until both exist. TurboSMS refuses any message without a sender
  // (REQUIRED_MESSAGE_SENDER), and only operator-approved alpha names pass.
  TURBO_SMS_API_TOKEN: optionalString,
  TURBO_SMS_SENDER: optionalString,

  // Shared secret of the /api/revalidate route. Absent = the route refuses
  // every call, so a deployment without it stays safe.
  REVALIDATE_SECRET: optionalString,

  // Vercel sends it as a bearer token with every scheduled call (vercel.json
  // crons). Absent = the cron routes refuse every call.
  CRON_SECRET: optionalString,

  // Google Analytics Data API, for the ad spend on the admin's earnings page:
  // the service account's whole JSON key as Google downloads it, and the GA4
  // property it reads. The key is parsed when used, so a bad paste costs the
  // page its ads line instead of the deployment. Absent = earnings only.
  GA4_SERVICE_ACCOUNT_JSON: optionalString,
  GA4_PROPERTY_ID: optionalString.pipe(z.union([z.string().regex(/^\d+$/), z.undefined()])),
})

export type Env = z.infer<typeof envSchema>

function readEnv(): Env {
  const result = envSchema.safeParse(process.env)
  if (result.success) return result.data

  const details = result.error.issues
    .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
    .join('\n')
  throw new Error(`Invalid environment variables:\n${details}`)
}

// Values marked NEXT_PUBLIC_* are read here on the server and handed to client
// components as props — the client bundle never imports this module.
export const env: Env = readEnv()

// One resolved address for everything the shop sends to itself. The sender is
// the last resort rather than a throw: an enquiry mailed to our own outbound
// address still reaches someone, an exception at boot reaches nobody.
export const enquiryRecipient: string =
  env.ENQUIRY_EMAIL_TO ?? env.ORDER_EMAIL_REPLY_TO ?? env.ORDER_EMAIL_FROM
