ALTER TABLE "stripe_events" RENAME TO "payment_events";--> statement-breakpoint
ALTER TABLE "payment_events" RENAME COLUMN "type" TO "status";--> statement-breakpoint
ALTER TABLE "payment_events" ADD COLUMN "provider" text DEFAULT 'mono' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" RENAME COLUMN "stripe_session_id" TO "payment_ref";--> statement-breakpoint
ALTER TABLE "orders" RENAME COLUMN "stripe_payment_intent" TO "payment_provider";--> statement-breakpoint
ALTER INDEX "orders_stripe_session_id_key" RENAME TO "orders_payment_ref_key";