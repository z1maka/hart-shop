ALTER TABLE "category_translations" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "product_translations" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "shipping_rates" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "category_translations" CASCADE;--> statement-breakpoint
DROP TABLE "product_translations" CASCADE;--> statement-breakpoint
DROP TABLE "shipping_rates" CASCADE;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "carrier" SET DATA TYPE text;--> statement-breakpoint
UPDATE "orders" SET "carrier" = 'nova_post' WHERE "carrier" IS NOT NULL AND "carrier" <> 'nova_post';--> statement-breakpoint
DROP TYPE "public"."carrier";--> statement-breakpoint
CREATE TYPE "public"."carrier" AS ENUM('nova_post');--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "carrier" SET DATA TYPE "public"."carrier" USING "carrier"::"public"."carrier";--> statement-breakpoint
DROP INDEX "products_status_price_idx";--> statement-breakpoint
ALTER TABLE "cart_items" ALTER COLUMN "currency" SET DEFAULT 'UAH';--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "currency" SET DEFAULT 'UAH';--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "locale" SET DEFAULT 'uk';--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "payment_route" SET DEFAULT 'cod';--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "currency" SET DEFAULT 'UAH';--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "delivery_kind" SET DEFAULT 'branch';--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "country" SET DEFAULT 'UA';--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "currency" SET DEFAULT 'UAH';--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "price_cents" integer NOT NULL DEFAULT 0;--> statement-breakpoint
UPDATE "products" SET "price_cents" = "price_gross_cents";--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "price_cents" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "sale_price_cents" integer;--> statement-breakpoint
CREATE INDEX "products_status_price_idx" ON "products" USING btree ("status","price_cents");--> statement-breakpoint
ALTER TABLE "cart_items" DROP COLUMN "unit_net_price_cents";--> statement-breakpoint
ALTER TABLE "carts" DROP COLUMN "contact_email";--> statement-breakpoint
ALTER TABLE "carts" DROP COLUMN "contact_name";--> statement-breakpoint
ALTER TABLE "carts" DROP COLUMN "contact_phone";--> statement-breakpoint
ALTER TABLE "carts" DROP COLUMN "contact_address";--> statement-breakpoint
ALTER TABLE "order_items" DROP COLUMN "unit_net_price_cents";--> statement-breakpoint
ALTER TABLE "order_items" DROP COLUMN "hs_code";--> statement-breakpoint
ALTER TABLE "order_items" DROP COLUMN "origin_country";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "buyer_vat_number";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "vat_cents";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "levy_cents";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "customs_regime";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "price_net_cents";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "price_gross_cents";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "source_price_uah";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "price_is_manual";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "fx_rate_at_import";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "duty_rate_pct";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "hs_code";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "origin_country";--> statement-breakpoint
DROP TYPE "public"."customs_regime";