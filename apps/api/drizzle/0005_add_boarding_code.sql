ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "boarding_code" varchar(20);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_booking_boarding_code_idx" ON "bookings" ("boarding_code");
