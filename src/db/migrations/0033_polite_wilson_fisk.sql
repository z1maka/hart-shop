-- The trigram operator class the three indexes below need.
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX "orders_order_number_trgm_idx" ON "orders" USING gin ("order_number" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "orders_recipient_name_trgm_idx" ON "orders" USING gin (("shipping_address" ->> 'fullName') gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "orders_recipient_phone_trgm_idx" ON "orders" USING gin ("recipient_phone" gin_trgm_ops);