ALTER TYPE "public"."enquiry_kind" ADD VALUE 'contact';--> statement-breakpoint
ALTER TABLE "enquiries" ALTER COLUMN "organisation" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "enquiries" ALTER COLUMN "contact_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "enquiries" ALTER COLUMN "country" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "enquiries" ADD COLUMN "telegram" text;--> statement-breakpoint
ALTER TABLE "enquiries" ADD COLUMN "topic" text;