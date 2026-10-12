ALTER TABLE "orders" ADD COLUMN "payment_route" text DEFAULT 'card' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "buyer_company" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "buyer_vat_number" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "invoice_number" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tracking_url" text;