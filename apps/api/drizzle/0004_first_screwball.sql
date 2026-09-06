CREATE TABLE IF NOT EXISTS "verification_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"token" varchar(64) NOT NULL,
	"code" varchar(10) NOT NULL,
	"academic_id" varchar(50),
	"is_verified" boolean DEFAULT false,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "academic_id" varchar(50);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "faculty" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_sheerid_verified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "sheerid_verification_id" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "current_session_id" varchar(64);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_login_device" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_login_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_active_seat_idx" ON "bookings" ("trip_id", "seat_number") WHERE "status" IN ('confirmed', 'swapped');