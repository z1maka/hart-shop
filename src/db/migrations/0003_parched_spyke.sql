CREATE INDEX "product_variants_color_idx" ON "product_variants" USING btree (("options" ->> 'Color'));--> statement-breakpoint
CREATE INDEX "products_status_price_idx" ON "products" USING btree ("status","price_gross_cents");--> statement-breakpoint
CREATE INDEX "products_status_weight_idx" ON "products" USING btree ("status","weight_grams");