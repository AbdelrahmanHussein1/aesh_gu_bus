ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "booking_ref" varchar(30);
--> statement-breakpoint
ALTER TABLE "bookings" DROP CONSTRAINT IF EXISTS "bookings_booking_ref_unique";
--> statement-breakpoint
DROP INDEX IF EXISTS "bookings_booking_ref_unique";
