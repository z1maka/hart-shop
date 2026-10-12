ALTER TABLE "categories" ADD COLUMN "seo_text" text;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "faq" jsonb DEFAULT '[]'::jsonb NOT NULL;