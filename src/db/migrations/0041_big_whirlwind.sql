CREATE TABLE "product_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"source" text DEFAULT 'site' NOT NULL,
	"source_id" text,
	"author_name" text NOT NULL,
	"rating" smallint NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"color" text,
	"phone_digits" text,
	"is_verified_purchase" boolean DEFAULT false NOT NULL,
	"reply_body" text,
	"replied_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_reviews_product_status_created_at_idx" ON "product_reviews" USING btree ("product_id","status","created_at");--> statement-breakpoint
CREATE INDEX "product_reviews_status_created_at_idx" ON "product_reviews" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "product_reviews_source_idx" ON "product_reviews" USING btree ("source","source_id");