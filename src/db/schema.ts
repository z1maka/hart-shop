import { sql } from 'drizzle-orm'
import {
  boolean,
  char,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import {
  AdminRole,
  Carrier,
  ContactPreference,
  DeliveryKind,
  EnquiryKind,
  EnquiryStatus,
  Locale,
  OrderStatus,
  PaymentRoute,
  ProductStatus,
  ReviewSource,
  ReviewStatus,
  type NotificationChannel,
  type NotificationKind,
  type NotificationStatus,
  type TrafficSource,
} from '@/db/enums'
import type { BankAccountDraft } from '@/config/requisites'
import type { FaqEntry } from '@/features/catalog/model/category-content'
import type { ProductVideo } from '@/features/catalog/model/product-video'

function enumValues<T extends Record<string, string>>(source: T): [T[keyof T], ...T[keyof T][]] {
  return Object.values(source) as [T[keyof T], ...T[keyof T][]]
}

export const productStatusEnum = pgEnum('product_status', enumValues(ProductStatus))
export const orderStatusEnum = pgEnum('order_status', enumValues(OrderStatus))
export const carrierEnum = pgEnum('carrier', enumValues(Carrier))
export const adminRoleEnum = pgEnum('admin_role', enumValues(AdminRole))
export const enquiryKindEnum = pgEnum('enquiry_kind', enumValues(EnquiryKind))
export const enquiryStatusEnum = pgEnum('enquiry_status', enumValues(EnquiryStatus))

// Domestic Nova Poshta needs no postcode: the branch identifier or the street
// plus city is what the label carries.
export type ShippingAddress = {
  readonly fullName: string
  readonly line1: string
  readonly line2?: string
  readonly city: string
  readonly postalCode?: string
  readonly country: string
  readonly phone?: string
}

export type VariantOptions = Record<string, string>

export type ProductSpec = {
  readonly label: string
  readonly value: string
}

const createdAt = timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
const updatedAt = timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    // What Google shows for the category page; the name and the description
    // stand in while these are empty.
    seoTitle: text('seo_title'),
    seoDescription: text('seo_description'),
    // The long read under the product grid — how to choose, how it works —
    // and the questions buyers ask, both written in the admin. Blank-line
    // paragraphs, «## » headings, «- » bullets.
    seoText: text('seo_text'),
    faq: jsonb('faq').$type<FaqEntry[]>().notNull().default([]),
    // Google's product taxonomy id for the shopping feed; see
    // catalog/model/google-category. Null leaves the category to Google.
    googleProductCategory: integer('google_product_category'),
    position: integer('position').notNull().default(0),
    isVisible: boolean('is_visible').notNull().default(true),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex('categories_slug_key').on(table.slug),
    index('categories_position_idx').on(table.position),
  ],
)

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    sku: text('sku').notNull(),
    sourceId: integer('source_id'),
    title: text('title').notNull(),
    description: text('description').notNull(),
    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
    // Overrides the category's Google taxonomy id where this product is a
    // different kind of thing (a tent among ponchos); null takes the category's.
    googleProductCategory: integer('google_product_category'),
    // The retail price in kopiykas. A set sale price shows as the current
    // price with the regular one struck through (AGENTS.md §9).
    priceCents: integer('price_cents').notNull(),
    salePriceCents: integer('sale_price_cents'),
    // One wholesale tier, as the WordPress shop had: from this many units of
    // the product, whatever the variants, each costs this much. Both or none.
    wholesaleMinQty: integer('wholesale_min_qty'),
    wholesalePriceCents: integer('wholesale_price_cents'),
    // What one unit costs the shop in kopiykas: the workshop's price for its
    // own sewing, the purchase price for bought-in goods; null until entered.
    // For the admin's margin and pay figures only — no storefront query,
    // feed or offer selects it.
    costCents: integer('cost_cents'),
    currency: char('currency', { length: 3 }).notNull().default('UAH'),
    weightGrams: integer('weight_grams').notNull(),
    layers: integer('layers').notNull().default(3),
    badge: text('badge'),
    // Position on the home best-sellers rail, curated by the owner: 1 is the
    // first card, null keeps the product off the rail. When no product
    // carries a position the rail falls back to the per-category mix.
    featuredOrder: integer('featured_order'),
    // Place under «Рекомендовані» in the catalog and every category, set by the
    // owner in the admin list: 1 comes first, null follows the numbered ones.
    // Kept apart from featuredOrder so arranging the shelf never moves the rail.
    catalogOrder: integer('catalog_order'),
    // The name a list can print. The imported WordPress titles carry every
    // keyword the old shop ranked for, which is right for the page heading
    // and unreadable in a card, a search result or a cart line.
    shortTitle: text('short_title'),
    // How the workshop calls it («чехлы ноги», «тент»); never shown to a
    // buyer. The packing chat's waybill card names the line by it (owner's
    // format, 19.10.2026); a product without one goes by its short title.
    packingTitle: text('packing_title'),
    status: productStatusEnum('status').notNull().default(ProductStatus.Draft),
    // Set when hiding a category archives this product, so re-publishing the
    // category can tell these apart from products archived by hand.
    archivedByCategory: boolean('archived_by_category').notNull().default(false),
    specs: jsonb('specs').$type<readonly ProductSpec[]>().notNull().default([]),
    // YouTube tests and reviews, shown as gallery slides after the photos;
    // see catalog/model/product-video.
    videos: jsonb('videos').$type<readonly ProductVideo[]>().notNull().default([]),
    included: text('included').array().notNull().default([]),
    careNotes: text('care_notes').array().notNull().default([]),
    seoTitle: text('seo_title'),
    // Two or three sentences in the shop's own words: shown under the price
    // and handed to Google as the page's description. The imported WordPress
    // seo_description stays as a fallback until every product has one.
    summary: text('summary'),
    seoDescription: text('seo_description'),
    // Who made it, for Google's markup and the Merchant feed; empty carries
    // the shop's name, for its own sewing and for unbranded goods.
    brand: text('brand'),
    // Products that are one model in different colours share this key: each
    // colour has its own page and text, and the colour tiles link between them.
    colorGroup: text('color_group'),
    faq: jsonb('faq').$type<FaqEntry[]>().notNull().default([]),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex('products_slug_key').on(table.slug),
    uniqueIndex('products_sku_key').on(table.sku),
    uniqueIndex('products_source_id_key').on(table.sourceId),
    index('products_status_category_idx').on(table.status, table.categoryId),
    index('products_title_idx').on(table.title),
    // The admin searches titles by fragment; a btree cannot serve ilike '%…%'.
    index('products_title_trgm_idx').using('gin', sql`${table.title} gin_trgm_ops`),
    index('products_status_price_idx').on(table.status, table.priceCents),
    check(
      'products_wholesale_pair_check',
      sql`(${table.wholesaleMinQty} is null) = (${table.wholesalePriceCents} is null)`,
    ),
    index('products_status_weight_idx').on(table.status, table.weightGrams),
    index('products_featured_order_idx')
      .on(table.featuredOrder)
      .where(sql`${table.featuredOrder} is not null`),
    index('products_catalog_order_idx')
      .on(table.catalogOrder)
      .where(sql`${table.catalogOrder} is not null`),
    index('products_color_group_idx')
      .on(table.colorGroup)
      .where(sql`${table.colorGroup} is not null`),
  ],
)

export const productVariants = pgTable(
  'product_variants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    sku: text('sku').notNull(),
    options: jsonb('options').$type<VariantOptions>().notNull(),
    priceDeltaCents: integer('price_delta_cents').notNull().default(0),
    stockQty: integer('stock_qty').notNull().default(0),
    position: integer('position').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    // The gallery shot that stands for this colour: the feed's main image for
    // the offer and where the product page jumps when the colour is chosen.
    // Null falls back to the product's first photo.
    coverImageId: uuid('cover_image_id').references(() => productImages.id, {
      onDelete: 'set null',
    }),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex('product_variants_sku_key').on(table.sku),
    index('product_variants_product_id_idx').on(table.productId, table.position),
    index('product_variants_color_idx').on(sql`(${table.options} ->> 'Color')`),
    index('product_variants_cover_image_idx').on(table.coverImageId),
  ],
)

export const productImages = pgTable(
  'product_images',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    storageKey: text('storage_key').notNull(),
    squareStorageKey: text('square_storage_key'),
    alt: text('alt').notNull(),
    position: integer('position').notNull().default(0),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    createdAt,
  },
  (table) => [
    uniqueIndex('product_images_storage_key_key').on(table.storageKey),
    index('product_images_product_id_idx').on(table.productId, table.position),
  ],
)

export const carts = pgTable(
  'carts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt,
    updatedAt,
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [index('carts_expires_at_idx').on(table.expiresAt)],
)

export const cartItems = pgTable(
  'cart_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cartId: uuid('cart_id')
      .notNull()
      .references(() => carts.id, { onDelete: 'cascade' }),
    variantId: uuid('variant_id')
      .notNull()
      .references(() => productVariants.id, { onDelete: 'cascade' }),
    quantity: integer('quantity').notNull(),
    productSlug: text('product_slug').notNull(),
    productTitle: text('product_title').notNull(),
    variantLabel: text('variant_label').notNull(),
    unitPriceCents: integer('unit_price_cents').notNull(),
    currency: char('currency', { length: 3 }).notNull().default('UAH'),
    weightGrams: integer('weight_grams').notNull(),
    imageStorageKey: text('image_storage_key'),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex('cart_items_cart_variant_key').on(table.cartId, table.variantId),
    index('cart_items_cart_id_idx').on(table.cartId),
  ],
)

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderNumber: text('order_number').notNull(),
    accessToken: text('access_token').notNull(),
    // Kept so the payment webhook can turn this order's stock holds into a
    // sale: reservations are keyed by cart, and the cart outlives checkout.
    cartId: uuid('cart_id').references(() => carts.id, { onDelete: 'set null' }),
    status: orderStatusEnum('status').notNull().default(OrderStatus.Pending),
    // Optional by the owner's decision (16.09.2026): the phone is the primary
    // contact of the domestic market, mail is sent only when an email exists.
    email: text('email'),
    // The storefront language at checkout: transactional mail follows it.
    locale: text('locale').notNull().default(Locale.Uk),
    paymentRoute: text('payment_route')
      .$type<PaymentRoute>()
      .notNull()
      .default(PaymentRoute.CashOnDelivery),
    paymentProvider: text('payment_provider'),
    paymentRef: text('payment_ref'),
    // Filled for a transfer: who the invoice is made out to.
    buyerCompany: text('buyer_company'),
    invoiceNumber: text('invoice_number'),
    // The account a transfer order was told to pay to, copied when it is
    // placed: switching the active account later must not change what the
    // buyer already has in their letter. Null for every other route.
    bankRequisites: jsonb('bank_requisites').$type<BankAccountDraft>(),
    trackingUrl: text('tracking_url'),
    subtotalCents: integer('subtotal_cents').notNull(),
    // Zero while delivery is billed by the carrier on receipt; kept as a real
    // column so a shop-paid tariff later is data, not a schema change.
    shippingCents: integer('shipping_cents').notNull(),
    totalCents: integer('total_cents').notNull(),
    currency: char('currency', { length: 3 }).notNull().default('UAH'),
    shippingAddress: jsonb('shipping_address').$type<ShippingAddress>().notNull(),
    // The phone as digits only: checkout and the quick order format it
    // differently, and the admin looks a returning buyer up by it.
    recipientPhone: text('recipient_phone').generatedAlwaysAs(
      sql`regexp_replace(shipping_address->>'phone', '\\D', '', 'g')`,
    ),
    // A parcel going to a pick-up point has no street of its own: the carrier's
    // own identifier is where it lands, and the label is what a human reads.
    deliveryKind: text('delivery_kind').notNull().default(DeliveryKind.Branch),
    pickupPointRef: text('pickup_point_ref'),
    pickupPointLabel: text('pickup_point_label'),
    // Chosen at checkout; orders from before the choice existed were called.
    contactPreference: text('contact_preference')
      .$type<ContactPreference>()
      .notNull()
      .default(ContactPreference.Call),
    // What the buyer wrote at checkout about the order (when to call, which
    // size, how to pack); null when they left nothing.
    customerNote: text('customer_note'),
    country: char('country', { length: 2 }).notNull().default('UA'),
    carrier: carrierEnum('carrier'),
    // Which cabinet the waybill was issued from; printing, tracking and
    // deletion keep using that one.
    carrierAccountId: uuid('carrier_account_id'),
    trackingNumber: text('tracking_number'),
    // The carrier's own id of the waybill issued from the admin: printing and
    // cancelling go by it, the buyer only ever sees the number.
    carrierDocumentRef: text('carrier_document_ref'),
    // Where the parcel is, as the hourly tracking last saw it: a shipping
    // ParcelStage, the carrier's own words, and when either last changed.
    parcelStage: text('parcel_stage'),
    parcelStatus: text('parcel_status'),
    parcelUpdatedAt: timestamp('parcel_updated_at', { withTimezone: true }),
    // A return closed by the admin: it leaves the returns tab for the
    // archive. Delivered and cancelled orders are archived by their status.
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    // The channel the buyer came from (TrafficSource) and its campaign or
    // tag, for the shop's own count of what each channel sells; null when
    // the buyer refused tracking.
    trafficSource: text('traffic_source').$type<TrafficSource>(),
    trafficDetail: text('traffic_detail'),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex('orders_order_number_key').on(table.orderNumber),
    uniqueIndex('orders_access_token_key').on(table.accessToken),
    uniqueIndex('orders_payment_ref_key').on(table.paymentRef),
    index('orders_status_created_at_idx').on(table.status, table.createdAt),
    index('orders_created_at_idx').on(table.createdAt),
    index('orders_paid_at_idx').on(table.paidAt),
    index('orders_recipient_phone_created_at_idx').on(table.recipientPhone, table.createdAt),
    // The admin searches by a fragment — part of a number, a phone or a
    // surname — and a b-tree cannot serve `%fragment%`.
    index('orders_order_number_trgm_idx').using('gin', sql`${table.orderNumber} gin_trgm_ops`),
    index('orders_recipient_name_trgm_idx').using(
      'gin',
      sql`(${table.shippingAddress} ->> 'fullName') gin_trgm_ops`,
    ),
    index('orders_recipient_phone_trgm_idx').using(
      'gin',
      sql`${table.recipientPhone} gin_trgm_ops`,
    ),
  ],
)

// Every message the shop sent, or tried to send, about an order: the admin
// reads it under the order («письмо ушло», «SMS не ушла»), and the crons
// that write to a buyer once (a review request, a reminder about a quick
// order) look here before writing.
export const orderNotifications = pgTable(
  'order_notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    kind: text('kind').$type<NotificationKind>().notNull(),
    channel: text('channel').$type<NotificationChannel>().notNull(),
    status: text('status').$type<NotificationStatus>().notNull(),
    // Why it was skipped or how it failed; the recipient when it was sent.
    detail: text('detail'),
    createdAt,
  },
  (table) => [
    index('order_notifications_order_created_at_idx').on(table.orderId, table.createdAt),
    index('order_notifications_kind_order_idx').on(table.kind, table.orderId),
  ],
)

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'set null' }),
    sku: text('sku').notNull(),
    productSlug: text('product_slug').notNull(),
    productTitle: text('product_title').notNull(),
    variantLabel: text('variant_label').notNull(),
    quantity: integer('quantity').notNull(),
    unitPriceCents: integer('unit_price_cents').notNull(),
    // What one unit cost the shop when it was ordered (the product's cost
    // then), so a later workshop price leaves past earnings alone; null when
    // the product had no cost entered. Admin only, like the product's cost.
    unitCostCents: integer('unit_cost_cents'),
    currency: char('currency', { length: 3 }).notNull().default('UAH'),
    weightGrams: integer('weight_grams').notNull(),
    imageStorageKey: text('image_storage_key'),
    createdAt,
  },
  (table) => [index('order_items_order_id_idx').on(table.orderId)],
)

export const inventoryReservations = pgTable(
  'inventory_reservations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    variantId: uuid('variant_id')
      .notNull()
      .references(() => productVariants.id, { onDelete: 'cascade' }),
    cartId: uuid('cart_id')
      .notNull()
      .references(() => carts.id, { onDelete: 'cascade' }),
    quantity: integer('quantity').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt,
  },
  (table) => [
    uniqueIndex('inventory_reservations_cart_variant_key').on(table.cartId, table.variantId),
    index('inventory_reservations_expires_at_idx').on(table.expiresAt),
    index('inventory_reservations_variant_id_idx').on(table.variantId),
  ],
)

export const adminUsers = pgTable(
  'admin_users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    role: adminRoleEnum('role').notNull().default(AdminRole.Staff),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    failedAttempts: integer('failed_attempts').notNull().default(0),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    // Every token issued before this moment is refused, which is how a session
    // gets revoked without a server-side session store.
    sessionsValidFrom: timestamp('sessions_valid_from', { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt,
    updatedAt,
  },
  (table) => [uniqueIndex('admin_users_email_key').on(table.email)],
)

export type EnquiryLine = {
  readonly sku: string
  readonly title: string
  readonly variantLabel: string
  readonly quantity: number
  readonly unitPriceCents: number
}

export const enquiries = pgTable(
  'enquiries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    kind: enquiryKindEnum('kind').notNull(),
    status: enquiryStatusEnum('status').notNull().default(EnquiryStatus.New),
    // A message from the contact form has no company, no name and no delivery
    // country — it is one person asking a question, so these stay optional.
    organisation: text('organisation'),
    contactName: text('contact_name'),
    // A request for custom sewing carries a phone and often nothing else:
    // the shop calls back rather than writes.
    email: text('email'),
    phone: text('phone'),
    telegram: text('telegram'),
    topic: text('topic'),
    country: char('country', { length: 2 }),
    quantity: integer('quantity'),
    deliveryAddress: text('delivery_address'),
    message: text('message').notNull(),
    cartLines: jsonb('cart_lines').$type<readonly EnquiryLine[]>().notNull().default([]),
    createdAt,
    updatedAt,
  },
  (table) => [
    index('enquiries_status_created_at_idx').on(table.status, table.createdAt),
    index('enquiries_created_at_idx').on(table.createdAt),
    index('enquiries_kind_idx').on(table.kind),
  ],
)

// Provider-agnostic idempotency ledger: one row per delivered webhook, so a
// repeated callback can never create a second order.
// A carrier cabinet: its own API key and its own sender. The workshop runs
// several and chooses which one a waybill leaves from; the sending branch is
// shared and lives in shop_settings.
export const carrierAccounts = pgTable(
  'carrier_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    carrier: carrierEnum('carrier').notNull(),
    name: text('name').notNull(),
    apiKey: text('api_key').notNull(),
    senderRef: text('sender_ref').notNull(),
    senderContactRef: text('sender_contact_ref').notNull(),
    senderName: text('sender_name').notNull(),
    senderPhone: text('sender_phone').notNull(),
    isDefault: boolean('is_default').notNull().default(false),
    // A cabinet is switched off rather than deleted: waybills already issued
    // from it are still tracked and printed with its key.
    isActive: boolean('is_active').notNull().default(true),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex('carrier_accounts_default_key')
      .on(table.carrier)
      .where(sql`${table.isDefault}`),
    index('carrier_accounts_carrier_idx').on(table.carrier),
  ],
)

// The accounts a buyer paying by transfer can be sent to. The owner keeps
// several and switches between them; exactly one is shown on the site.
export const bankAccounts = pgTable(
  'bank_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // What the admin calls it; never shown to a buyer.
    name: text('name').notNull(),
    recipient: text('recipient').notNull(),
    // Stored unbroken, as a banking app takes it; grouped only for display.
    iban: text('iban').notNull(),
    taxId: text('tax_id').notNull(),
    bankName: text('bank_name').notNull(),
    bankEdrpou: text('bank_edrpou').notNull(),
    isActive: boolean('is_active').notNull().default(false),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex('bank_accounts_active_key')
      .on(table.isActive)
      .where(sql`${table.isActive}`),
    uniqueIndex('bank_accounts_iban_key').on(table.iban),
  ],
)

// One row per switch the owner can flip in the admin. A table rather than
// an env var: the shop changes these while it runs, and a deploy to change a
// toggle is a deploy nobody makes.
export const shopSettings = pgTable('shop_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt,
})

export const paymentEvents = pgTable('payment_events', {
  eventId: text('event_id').primaryKey(),
  provider: text('provider').notNull(),
  status: text('status').notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
})

// A local copy of the carriers' pick-up point directories, refreshed daily.
// Nova Poshta answers about one directory call a second per key — a checkout
// with a few buyers at once would hit that — and the copy is also where the
// points' weight limits are filtered.
export const pickupPoints = pgTable(
  'pickup_points',
  {
    carrier: carrierEnum('carrier').notNull(),
    ref: text('ref').notNull(),
    settlementRef: text('settlement_ref').notNull(),
    kind: text('kind').$type<DeliveryKind>().notNull(),
    number: integer('number').notNull(),
    name: text('name').notNull(),
    address: text('address').notNull(),
    maxWeightGrams: integer('max_weight_grams'),
    syncedAt: timestamp('synced_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.carrier, table.ref] }),
    index('pickup_points_settlement_kind_number_idx').on(
      table.carrier,
      table.settlementRef,
      table.kind,
      table.number,
    ),
    index('pickup_points_carrier_synced_at_idx').on(table.carrier, table.syncedAt),
  ],
)

// What buyers say about a product. A review is shown as it came or kept off
// the site, never edited. The phone is what ties a site review to an order
// («Купив у нас»); it is stored as digits and never shown.
export const productReviews = pgTable(
  'product_reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    status: text('status').$type<ReviewStatus>().notNull().default(ReviewStatus.Pending),
    source: text('source').$type<ReviewSource>().notNull().default(ReviewSource.Site),
    // The review's identity at its source, so an import can run again
    // without doubling anything; null for reviews written on the site.
    sourceId: text('source_id'),
    authorName: text('author_name').notNull(),
    rating: smallint('rating').notNull(),
    // Empty for a rating-only review: it counts in the average and stays
    // out of the list.
    body: text('body').notNull().default(''),
    // The marketplace's one-tap tags («Швидко відправили»…): what a review
    // without words still says. Shown as chips; empty for site reviews.
    tags: text('tags').array().notNull().default([]),
    color: text('color'),
    phoneDigits: text('phone_digits'),
    isVerifiedPurchase: boolean('is_verified_purchase').notNull().default(false),
    replyBody: text('reply_body'),
    repliedAt: timestamp('replied_at', { withTimezone: true }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    // For an imported review, the date it was written at the source.
    createdAt,
  },
  (table) => [
    index('product_reviews_product_status_created_at_idx').on(
      table.productId,
      table.status,
      table.createdAt,
    ),
    index('product_reviews_status_created_at_idx').on(table.status, table.createdAt),
    uniqueIndex('product_reviews_source_idx').on(table.source, table.sourceId),
    // The moderation search: a name or a phrase from the text.
    index('product_reviews_author_name_trgm_idx').using(
      'gin',
      sql`${table.authorName} gin_trgm_ops`,
    ),
    index('product_reviews_body_trgm_idx').using('gin', sql`${table.body} gin_trgm_ops`),
  ],
)
