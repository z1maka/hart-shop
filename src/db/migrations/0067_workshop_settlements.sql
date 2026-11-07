-- Settlement numbers start at 1 (owner, 07.11.2026).
CREATE SEQUENCE IF NOT EXISTS "workshop_settlement_number_seq" START WITH 1 INCREMENT BY 1;--> statement-breakpoint
CREATE TABLE "workshop_settlement_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"settlement_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"order_number" text NOT NULL,
	"items_label" text NOT NULL,
	"tracking_number" text,
	"sale_cents" integer NOT NULL,
	"cost_cents" integer NOT NULL,
	"cod_fee_cents" integer NOT NULL,
	"amount_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workshop_settlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" integer DEFAULT nextval('workshop_settlement_number_seq') NOT NULL,
	"status" text NOT NULL,
	"period_from" date NOT NULL,
	"period_to" date NOT NULL,
	"cod_fee_basis_points" integer NOT NULL,
	"cod_fee_fixed_cents" integer NOT NULL,
	"total_cents" integer NOT NULL,
	"paid_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivered_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "workshop_settlement_lines" ADD CONSTRAINT "workshop_settlement_lines_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workshop_settlement_lines" ADD CONSTRAINT "workshop_settlement_lines_settlement_fk" FOREIGN KEY ("settlement_id") REFERENCES "public"."workshop_settlements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "workshop_settlement_lines_order_kind_key" ON "workshop_settlement_lines" USING btree ("order_id","kind");--> statement-breakpoint
CREATE INDEX "workshop_settlement_lines_settlement_idx" ON "workshop_settlement_lines" USING btree ("settlement_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workshop_settlements_number_key" ON "workshop_settlements" USING btree ("number");--> statement-breakpoint
CREATE INDEX "workshop_settlements_status_idx" ON "workshop_settlements" USING btree ("status");--> statement-breakpoint
CREATE INDEX "workshop_settlements_created_at_idx" ON "workshop_settlements" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "orders_delivered_at_idx" ON "orders" USING btree ("delivered_at") WHERE "orders"."status" = 'delivered';--> statement-breakpoint
-- Orders collected before the column existed: a cash-on-delivery order was
-- paid at the branch the moment it was collected; any other order reached
-- Delivered on its last parcel update, else on its last change.
UPDATE "orders" SET "delivered_at" = COALESCE(
	CASE WHEN "payment_route" = 'cod' THEN "paid_at" END,
	"parcel_updated_at",
	"updated_at"
) WHERE "status" = 'delivered' AND "delivered_at" IS NULL;
