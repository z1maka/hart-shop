ALTER TABLE "products" ADD COLUMN "brand" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "color_group" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "faq" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
CREATE INDEX "products_color_group_idx" ON "products" USING btree ("color_group") WHERE "products"."color_group" is not null;