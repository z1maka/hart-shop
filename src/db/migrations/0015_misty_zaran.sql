ALTER TABLE "orders" ADD COLUMN "delivery_kind" text DEFAULT 'courier' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "pickup_point_ref" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "pickup_point_label" text;