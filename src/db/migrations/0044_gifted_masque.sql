ALTER TABLE "products" ADD COLUMN "wholesale_min_qty" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "wholesale_price_cents" integer;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_wholesale_pair_check" CHECK (("products"."wholesale_min_qty" is null) = ("products"."wholesale_price_cents" is null));