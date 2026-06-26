ALTER TABLE "bookings" ADD COLUMN "booking_type" varchar(20) DEFAULT 'one_way' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "leg_type" varchar(15) DEFAULT 'to_campus' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "paired_booking_id" uuid;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "qr_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "qr_used_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "swap_logs" ADD COLUMN "old_trip_id" integer;--> statement-breakpoint
ALTER TABLE "swap_logs" ADD COLUMN "old_seat_number" integer;--> statement-breakpoint
ALTER TABLE "swap_logs" ADD COLUMN "new_trip_id" integer;--> statement-breakpoint
ALTER TABLE "swap_logs" ADD COLUMN "new_seat_number" integer;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "time_slot" varchar(20) DEFAULT 'morning_1' NOT NULL;