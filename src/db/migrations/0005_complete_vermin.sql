ALTER TABLE "cart_items" ADD COLUMN "unit_net_price_cents" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "unit_net_price_cents" integer NOT NULL;