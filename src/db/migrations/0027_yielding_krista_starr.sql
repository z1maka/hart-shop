CREATE TABLE "pickup_points" (
	"carrier" "carrier" NOT NULL,
	"ref" text NOT NULL,
	"settlement_ref" text NOT NULL,
	"kind" text NOT NULL,
	"number" integer NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"max_weight_grams" integer,
	"synced_at" timestamp with time zone NOT NULL,
	CONSTRAINT "pickup_points_carrier_ref_pk" PRIMARY KEY("carrier","ref")
);
--> statement-breakpoint
CREATE INDEX "pickup_points_settlement_kind_number_idx" ON "pickup_points" USING btree ("carrier","settlement_ref","kind","number");--> statement-breakpoint
CREATE INDEX "pickup_points_carrier_synced_at_idx" ON "pickup_points" USING btree ("carrier","synced_at");