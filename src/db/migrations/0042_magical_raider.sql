CREATE INDEX "product_reviews_author_name_trgm_idx" ON "product_reviews" USING gin ("author_name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "product_reviews_body_trgm_idx" ON "product_reviews" USING gin ("body" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_title_trgm_idx" ON "products" USING gin ("title" gin_trgm_ops);