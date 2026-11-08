ALTER TABLE "order_items" ADD COLUMN "unit_production_cost_cents" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "production_cost_cents" integer;