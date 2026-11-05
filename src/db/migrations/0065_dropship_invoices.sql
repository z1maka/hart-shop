-- Invoice numbers run on from the last one issued by hand (343, 05.11.2026).
CREATE SEQUENCE IF NOT EXISTS "invoice_number_seq" START WITH 344 INCREMENT BY 1;--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" integer DEFAULT nextval('invoice_number_seq') NOT NULL,
	"order_id" uuid NOT NULL,
	"status" text NOT NULL,
	"issued_on" date NOT NULL,
	"valid_until" date NOT NULL,
	"buyer" jsonb NOT NULL,
	"seller" jsonb NOT NULL,
	"lines" jsonb NOT NULL,
	"total_cents" integer NOT NULL,
	"payment_purpose" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resellers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"tax_id" text NOT NULL,
	"contact_name" text,
	"phone" text,
	"email" text,
	"legal_address" text,
	"payout_iban" text,
	"contract_ref" text,
	"note" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "channel" text DEFAULT 'site' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "reseller_id" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "reseller_order_ref" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "drop_price_cents" integer;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_number_key" ON "invoices" USING btree ("number");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_order_issued_key" ON "invoices" USING btree ("order_id") WHERE "invoices"."status" = 'issued';--> statement-breakpoint
CREATE INDEX "invoices_order_created_at_idx" ON "invoices" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE INDEX "resellers_active_name_idx" ON "resellers" USING btree ("is_active","name");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_reseller_id_resellers_id_fk" FOREIGN KEY ("reseller_id") REFERENCES "public"."resellers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "orders_channel_created_at_idx" ON "orders" USING btree ("channel","created_at");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_reseller_channel_check" CHECK (("orders"."channel" = 'dropship') = ("orders"."reseller_id" is not null));--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_drop_price_positive_check" CHECK ("products"."drop_price_cents" > 0);