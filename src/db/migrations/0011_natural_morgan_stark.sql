ALTER TABLE "admin_users" ADD COLUMN "failed_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "locked_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "sessions_valid_from" timestamp with time zone DEFAULT now() NOT NULL;