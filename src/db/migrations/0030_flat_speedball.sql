ALTER TABLE "orders" ADD COLUMN "parcel_stage" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "parcel_status" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "parcel_updated_at" timestamp with time zone;