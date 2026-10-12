CREATE TABLE "carrier_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"carrier" "carrier" NOT NULL,
	"name" text NOT NULL,
	"api_key" text NOT NULL,
	"sender_ref" text NOT NULL,
	"sender_contact_ref" text NOT NULL,
	"sender_name" text NOT NULL,
	"sender_phone" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "carrier_account_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "carrier_accounts_default_key" ON "carrier_accounts" USING btree ("carrier") WHERE "carrier_accounts"."is_default";--> statement-breakpoint
CREATE INDEX "carrier_accounts_carrier_idx" ON "carrier_accounts" USING btree ("carrier");