CREATE TABLE "bank_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"recipient" text NOT NULL,
	"iban" text NOT NULL,
	"tax_id" text NOT NULL,
	"bank_name" text NOT NULL,
	"bank_edrpou" text NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "bank_accounts_active_key" ON "bank_accounts" USING btree ("is_active") WHERE "bank_accounts"."is_active";--> statement-breakpoint
CREATE UNIQUE INDEX "bank_accounts_iban_key" ON "bank_accounts" USING btree ("iban");--> statement-breakpoint
INSERT INTO "bank_accounts" ("name", "recipient", "iban", "tax_id", "bank_name", "bank_edrpou", "is_active")
SELECT 'Основной счёт', "value"->>'recipient', "value"->>'iban', "value"->>'taxId', "value"->>'bankName', "value"->>'bankEdrpou', true
FROM "shop_settings"
WHERE "key" = 'payment.bank_requisites' AND "value" ? 'iban';--> statement-breakpoint
DELETE FROM "shop_settings" WHERE "key" = 'payment.bank_requisites';
